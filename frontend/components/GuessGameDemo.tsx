"use client";

import { useState } from "react";
import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useGuessGame } from "../hooks/useGuessGame";

export const GuessGameDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const game = useGuessGame({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [minRange, setMinRange] = useState<number>(1);
  const [maxRange, setMaxRange] = useState<number>(10);
  const [guess, setGuess] = useState<string>("");

  const buttonClass =
    "inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm " +
    "transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-6 text-4xl font-bold text-gray-800">
            Encrypted Number Guessing Game
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            Connect your MetaMask wallet to start playing
          </p>
          <button className={buttonClass} onClick={connect}>
            Connect to MetaMask
          </button>
        </div>
      </div>
    );
  }

  // Only show deployment error when chainId is defined but contract is not deployed
  if (chainId !== undefined && game.isDeployed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Contract Not Deployed
          </h1>
          <p className="text-gray-600">
            The GuessGame contract is not deployed on chainId={chainId}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-5xl font-bold text-gray-800">
            🔐 Encrypted Number Guessing Game
          </h1>
          <p className="text-lg text-gray-600">
            A privacy-preserving game powered by FHEVM
          </p>
        </div>

        {/* Status Panel */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Game Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Chain ID:</span>{" "}
              <span className="text-gray-800">{chainId}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Account:</span>{" "}
              <span className="font-mono text-gray-800">
                {accounts?.[0]?.slice(0, 6)}...{accounts?.[0]?.slice(-4)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">FHEVM Status:</span>{" "}
              <span className={`font-semibold ${
                fhevmStatus === "ready" ? "text-green-600" : "text-yellow-600"
              }`}>
                {fhevmStatus}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Contract:</span>{" "}
              <span className="font-mono text-gray-800">
                {game.contractAddress?.slice(0, 6)}...{game.contractAddress?.slice(-4)}
              </span>
            </div>
          </div>
        </div>

        {/* Game Session Info */}
        {game.gameSession && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-700">Current Game</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Range</div>
                <div className="text-lg font-semibold text-gray-800">
                  {game.gameSession.minRange} - {game.gameSession.maxRange}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Attempts</div>
                <div className="text-lg font-semibold text-gray-800">
                  {game.gameSession.attemptCount}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className={`text-lg font-semibold ${
                  game.gameSession.finished ? "text-green-600" : "text-blue-600"
                }`}>
                  {game.gameSession.finished ? "Finished" : "In Progress"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Game Section */}
        {(!game.gameSession || game.gameSession.finished) && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-700">Start New Game</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Minimum Range
                  </label>
                  <input
                    type="number"
                    value={minRange}
                    onChange={(e) => setMinRange(Number(e.target.value))}
                    className={inputClass}
                    min="1"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Maximum Range
                  </label>
                  <input
                    type="number"
                    value={maxRange}
                    onChange={(e) => setMaxRange(Number(e.target.value))}
                    className={inputClass}
                    min={minRange + 1}
                  />
                </div>
              </div>
              <button
                className={buttonClass + " w-full"}
                onClick={() => game.startGame(minRange, maxRange)}
                disabled={game.isLoading || minRange >= maxRange}
              >
                {game.isLoading ? "Starting Game..." : "Start Game"}
              </button>
            </div>
          </div>
        )}

        {/* Game Panels - Horizontal Layout */}
        {game.gameSession && (
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Make Guess Panel */}
            {!game.gameSession.finished && (
              <div className="rounded-lg bg-white p-6 shadow-md">
                <h2 className="mb-4 text-xl font-semibold text-gray-700">Make a Guess</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Your Guess
                    </label>
                    <input
                      type="number"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      className={inputClass}
                      min={game.gameSession.minRange}
                      max={game.gameSession.maxRange}
                      placeholder={`Enter a number between ${game.gameSession.minRange} and ${game.gameSession.maxRange}`}
                    />
                  </div>
                  <button
                    className={buttonClass + " w-full"}
                    onClick={() => {
                      const guessNum = Number(guess);
                      if (guessNum >= game.gameSession!.minRange && guessNum <= game.gameSession!.maxRange) {
                        game.makeGuess(guessNum);
                        setGuess("");
                      }
                    }}
                    disabled={game.isGuessing || !guess || Number(guess) < game.gameSession!.minRange || Number(guess) > game.gameSession!.maxRange}
                  >
                    {game.isGuessing ? "Submitting Guess..." : "Submit Guess"}
                  </button>
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-sm text-gray-600">End game at any time:</p>
                    <button
                      className={buttonClass + " w-full bg-red-600 hover:bg-red-700 active:bg-red-800"}
                      onClick={game.abortGame}
                      disabled={game.isLoading}
                    >
                      {game.isLoading ? "Ending..." : "End Game Now"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Result Panel */}
            <div className="rounded-lg bg-green-50 p-6 shadow-md">
              <h2 className="mb-4 text-xl font-semibold text-green-800">Result</h2>
              {game.comparisonResultHandle && !game.clearComparisonResult ? (
                <div>
                  <p className="mb-4 text-green-700">
                    Your guess has been processed. Decrypt to see the result.
                  </p>
                  <button
                    className={buttonClass}
                    onClick={game.decryptComparisonResult}
                    disabled={game.isDecrypting}
                  >
                    {game.isDecrypting ? "Decrypting..." : "Decrypt Result"}
                  </button>
                </div>
              ) : game.clearComparisonResult ? (
                <div>
                  <div className="text-lg font-semibold text-green-700">
                    {(() => {
                      const result = Number(game.clearComparisonResult.clear);
                      if (result === 0) return "📉 Your guess is too small";
                      if (result === 1) return "🎉 Congratulations! You guessed correctly!";
                      if (result === 2) return "📈 Your guess is too large";
                      return "Unknown result";
                    })()}
                  </div>
                  {Number(game.clearComparisonResult.clear) === 1 && !game.gameSession.finished && (
                    <button
                      className={buttonClass + " mt-4 w-full"}
                      onClick={game.finishGame}
                      disabled={game.isLoading}
                    >
                      {game.isLoading ? "Finishing Game..." : "Finish Game & Calculate Score"}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-green-700">No result yet. Make a guess to see the result.</p>
              )}
            </div>

            {/* Score Panel */}
            <div className="rounded-lg bg-purple-50 p-6 shadow-md">
              <h2 className="mb-4 text-xl font-semibold text-purple-800">Your Score</h2>
              {game.gameSession.finished && game.scoreHandle ? (
                !game.clearScore ? (
                  <div>
                    <p className="mb-4 text-purple-700">
                      Your encrypted score is ready. Decrypt to see your final score.
                    </p>
                    <button
                      className={buttonClass}
                      onClick={game.decryptScore}
                      disabled={game.isDecrypting}
                    >
                      {game.isDecrypting ? "Decrypting Score..." : "Decrypt Score"}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-700">
                      {(() => {
                        const base = game.gameSession!.maxRange - game.gameSession!.minRange + 1;
                        const attempts = game.gameSession!.attemptCount || 1;
                        const value = base / attempts;
                        return value.toFixed(3);
                      })()}
                    </div>
                    <p className="mt-2 text-sm text-purple-600">
                      Based on range size and number of attempts
                    </p>
                  </div>
                )
              ) : (
                <p className="text-purple-700">
                  {game.gameSession.finished 
                    ? "Game ended. No score available." 
                    : "Finish the game to see your score."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Message Display */}
        {game.message && (
          <div className="rounded-lg bg-blue-50 p-4 shadow-md">
            <p className="text-blue-800">{game.message}</p>
          </div>
        )}

        {/* Error Display */}
        {fhevmError && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 shadow-md">
            <p className="text-red-800">FHEVM Error: {fhevmError.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

