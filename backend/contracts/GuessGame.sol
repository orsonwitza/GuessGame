// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Number Guessing Game
/// @notice A privacy-preserving guessing game where players guess encrypted numbers
/// @dev All game logic operates on encrypted data using FHEVM
contract GuessGame is SepoliaConfig {
    /// @notice Game session structure
    struct GameSession {
        bytes enc_secret;        // Encrypted random number
        uint256 minRange;        // Minimum range (plaintext)
        uint256 maxRange;        // Maximum range (plaintext)
        uint256 attemptCount;    // Number of attempts (plaintext)
        bytes enc_score;         // Encrypted score
        bool finished;           // Whether game is finished
    }

    /// @notice Mapping from player address to their game session
    mapping(address => GameSession) public gameSessions;

    /// @notice Event emitted when a new game is started
    event GameStarted(address indexed player, uint256 minRange, uint256 maxRange);

    /// @notice Event emitted when a guess is made
    event GuessMade(address indexed player, uint256 attemptCount);

    /// @notice Event emitted when a game is finished
    event GameFinished(address indexed player, uint256 attemptCount);

    /// @notice Event emitted when a game is aborted
    event GameAborted(address indexed player, uint256 attemptCount);

    /// @notice Start a new game with specified range
    /// @param minRange Minimum value of the range (plaintext)
    /// @param maxRange Maximum value of the range (plaintext)
    /// @dev Generates an encrypted random number within the range using FHEVM
    function startGame(uint256 minRange, uint256 maxRange) external {
        require(minRange < maxRange, "Invalid range");
        require(maxRange <= type(uint32).max, "Range too large");

        // Generate encrypted random number within [minRange, maxRange]
        // Use modulo with plaintext divisor, then shift by minRange
        uint256 rangeSize256 = maxRange - minRange + 1;
        require(rangeSize256 <= type(uint32).max, "Range size too large");

        euint32 secret = FHE.add(
            FHE.rem(FHE.randEuint32(), uint32(rangeSize256)),
            uint32(minRange)
        );

        // Store game session
        gameSessions[msg.sender] = GameSession({
            enc_secret: abi.encode(secret),
            minRange: minRange,
            maxRange: maxRange,
            attemptCount: 0,
            enc_score: "",
            finished: false
        });

        // Reset last comparison result for the new game
        lastComparisonResults[msg.sender] = "";

        // Grant ACL permissions for the encrypted secret
        FHE.allowThis(secret);
        FHE.allow(secret, msg.sender);

        emit GameStarted(msg.sender, minRange, maxRange);
    }

    /// @notice Store the last comparison result for each player
    mapping(address => bytes) public lastComparisonResults;

    /// @notice Make a guess
    /// @param guessEuint32 The encrypted guess value
    /// @param inputProof The input proof for the encrypted guess
    /// @return encResult Encrypted comparison result handle (0 = less, 1 = equal, 2 = greater)
    function makeGuess(externalEuint32 guessEuint32, bytes calldata inputProof) 
        external 
        returns (euint32 encResult) 
    {
        GameSession storage session = gameSessions[msg.sender];
        require(session.enc_secret.length > 0, "Game not started");
        require(!session.finished, "Game already finished");

        // Decode the encrypted secret
        euint32 secret = abi.decode(session.enc_secret, (euint32));

        // Convert external encrypted input to internal
        euint32 guess = FHE.fromExternal(guessEuint32, inputProof);

        // Increment attempt count
        session.attemptCount++;

        // Perform encrypted comparisons
        ebool isEqual = FHE.eq(secret, guess);
        ebool isGreater = FHE.gt(guess, secret);

        // Convert boolean results to uint32: 0 = less, 1 = equal, 2 = greater
        // Using select to choose values based on encrypted conditions
        euint32 result = FHE.select(
            isEqual,
            FHE.asEuint32(1),  // If equal, return 1
            FHE.select(
                isGreater,
                FHE.asEuint32(2),  // If greater, return 2
                FHE.asEuint32(0)    // Otherwise (less), return 0
            )
        );

        // Grant ACL permissions for the result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        // Store the result
        lastComparisonResults[msg.sender] = abi.encode(result);

        // Check if game is finished (we need to decrypt to check, but we'll handle this differently)
        // Since we can't decrypt in the contract, we'll let the frontend check and call finishGame
        emit GuessMade(msg.sender, session.attemptCount);

        return result;
    }

    /// @notice Finish the game and calculate score (called by frontend after decrypting equal result)
    /// @dev This should be called after the player decrypts and confirms they guessed correctly
    function finishGame() external {
        GameSession storage session = gameSessions[msg.sender];
        require(session.enc_secret.length > 0, "Game not started");
        require(!session.finished, "Game already finished");
        require(session.attemptCount > 0, "No guesses made");

        // Mark game as finished
        session.finished = true;
        
        // Calculate encrypted score: base = maxRange - minRange + 1
        // score = base / attemptCount (division requires plaintext divisor)
        uint256 base = session.maxRange - session.minRange + 1;
        euint32 baseEnc = FHE.asEuint32(uint32(base));
        euint32 score = FHE.div(baseEnc, uint32(session.attemptCount));
        
        // Grant ACL permissions for the score
        FHE.allowThis(score);
        FHE.allow(score, msg.sender);
        
        session.enc_score = abi.encode(score);
        
        emit GameFinished(msg.sender, session.attemptCount);
    }

    /// @notice Abort the current game without calculating a score
    function abortGame() external {
        GameSession storage session = gameSessions[msg.sender];
        require(session.enc_secret.length > 0, "Game not started");
        require(!session.finished, "Game already finished");

        session.finished = true;
        session.enc_score = "";

        emit GameAborted(msg.sender, session.attemptCount);
    }

    /// @notice Get the encrypted comparison result from the last guess
    /// @return encResult Encrypted result handle (0 = less, 1 = equal, 2 = greater)
    function getLastComparisonResult() external view returns (euint32 encResult) {
        require(lastComparisonResults[msg.sender].length > 0, "No comparison result");
        euint32 result = abi.decode(lastComparisonResults[msg.sender], (euint32));
        return result;
    }

    /// @notice Get the encrypted score if game is finished
    /// @return encScore Encrypted score handle
    function getEncryptedScore() external view returns (euint32 encScore) {
        GameSession storage session = gameSessions[msg.sender];
        require(session.finished, "Game not finished");
        require(session.enc_score.length > 0, "Score not calculated");
        
        euint32 score = abi.decode(session.enc_score, (euint32));
        return score;
    }

    /// @notice Get game session information (plaintext parts)
    /// @return minRange Minimum range
    /// @return maxRange Maximum range
    /// @return attemptCount Number of attempts
    /// @return finished Whether game is finished
    function getGameSession() external view returns (
        uint256 minRange,
        uint256 maxRange,
        uint256 attemptCount,
        bool finished
    ) {
        GameSession storage session = gameSessions[msg.sender];
        require(session.enc_secret.length > 0, "Game not started");
        
        return (
            session.minRange,
            session.maxRange,
            session.attemptCount,
            session.finished
        );
    }
}

