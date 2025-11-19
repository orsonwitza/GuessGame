"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

// Import generated ABI and addresses
import { GuessGameABI } from "@/abi/GuessGameABI";
import { GuessGameAddresses } from "@/abi/GuessGameAddresses";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type GuessGameInfoType = {
  abi: any;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getGuessGameByChainId(
  chainId: number | undefined
): GuessGameInfoType {
  if (!chainId) {
    return { abi: GuessGameABI };
  }

  const entry = GuessGameAddresses[chainId.toString()];

  if (!entry || !entry.address || entry.address === ethers.ZeroAddress) {
    return { abi: GuessGameABI, chainId };
  }

  return {
    address: entry.address as `0x${string}`,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: GuessGameABI,
  };
}

export const useGuessGame = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [gameSession, setGameSession] = useState<{
    minRange: number;
    maxRange: number;
    attemptCount: number;
    finished: boolean;
  } | undefined>(undefined);
  const [comparisonResultHandle, setComparisonResultHandle] = useState<string | undefined>(undefined);
  const [clearComparisonResult, setClearComparisonResult] = useState<ClearValueType | undefined>(undefined);
  const [scoreHandle, setScoreHandle] = useState<string | undefined>(undefined);
  const [clearScore, setClearScore] = useState<ClearValueType | undefined>(undefined);
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isGuessing, setIsGuessing] = useState<boolean>(false);

  const guessGameRef = useRef<GuessGameInfoType | undefined>(undefined);
  const isDecryptingRef = useRef<boolean>(false);
  const isGuessingRef = useRef<boolean>(false);
  const clearComparisonResultRef = useRef<ClearValueType | undefined>(undefined);
  const clearScoreRef = useRef<ClearValueType | undefined>(undefined);
  const comparisonResultHandleRef = useRef<string | undefined>(undefined);

  const guessGame = useMemo(() => {
    const g = getGuessGameByChainId(chainId);
    guessGameRef.current = g;
    // Only show error message when chainId is defined but no address is found
    if (chainId !== undefined && !g.address) {
      setMessage(`GuessGame deployment not found for chainId=${chainId}.`);
    }
    return g;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!guessGame) {
      return undefined;
    }
    return Boolean(guessGame.address) && guessGame.address !== ethers.ZeroAddress;
  }, [guessGame]);

  // Refresh game session
  const refreshGameSession = useCallback(() => {
    if (!guessGame.address || !ethersReadonlyProvider) {
      setGameSession(undefined);
      return;
    }

    const contract = new ethers.Contract(
      guessGame.address!,
      guessGame.abi,
      ethersReadonlyProvider
    );

    contract
      .getGameSession()
      .then((result: [bigint, bigint, bigint, boolean]) => {
        setGameSession({
          minRange: Number(result[0]),
          maxRange: Number(result[1]),
          attemptCount: Number(result[2]),
          finished: result[3],
        });
      })
      .catch((e: Error) => {
        // Silently handle "Game not started" error - this is expected when no game is active
        const errorMessage = e.message || String(e);
        if (!errorMessage.includes("Game not started")) {
          console.error("Failed to get game session:", e);
        }
        setGameSession(undefined);
      });
  }, [guessGame.address, guessGame.abi, ethersReadonlyProvider]);

  useEffect(() => {
    if (guessGame.address && ethersReadonlyProvider) {
      refreshGameSession();
    }
  }, [refreshGameSession]);

  // Restore last comparison result handle after refresh if attempts > 0
  useEffect(() => {
    if (!guessGame.address || !ethersReadonlyProvider) {
      return;
    }
    if (!gameSession || gameSession.attemptCount <= 0) {
      setComparisonResultHandle(undefined);
      setClearComparisonResult(undefined);
      clearComparisonResultRef.current = undefined;
      return;
    }

    const contract = new ethers.Contract(
      guessGame.address!,
      guessGame.abi,
      ethersReadonlyProvider
    );

    contract
      .getLastComparisonResult()
      .then((handle: string) => {
        if (handle !== comparisonResultHandleRef.current) {
          setClearComparisonResult(undefined);
          clearComparisonResultRef.current = undefined;
        }
        comparisonResultHandleRef.current = handle;
        setComparisonResultHandle(handle);
      })
      .catch((e: Error) => {
        const msg = e.message || String(e);
        if (!msg.includes("No comparison result")) {
          console.warn("Failed to restore comparison result handle:", e);
        }
        setComparisonResultHandle(undefined);
      });
  }, [
    guessGame.address,
    guessGame.abi,
    ethersReadonlyProvider,
    gameSession?.attemptCount,
  ]);

  // Sync comparisonResultHandle ref with state
  useEffect(() => {
    comparisonResultHandleRef.current = comparisonResultHandle;
  }, [comparisonResultHandle]);

  // Start game
  const startGame = useCallback(
    async (minRange: number, maxRange: number) => {
      if (!guessGame.address || !ethersSigner) {
        setMessage("Contract not deployed or signer not available");
        return;
      }

      setIsLoading(true);
      setMessage(`Starting game with range ${minRange}-${maxRange}...`);

      try {
        const contract = new ethers.Contract(
          guessGame.address!,
          guessGame.abi,
          ethersSigner
        );

        const tx = await contract.startGame(minRange, maxRange);
        setMessage(`Waiting for transaction: ${tx.hash}...`);
        await tx.wait();
        setMessage("Game started successfully!");
        refreshGameSession();
      } catch (error: any) {
        setMessage(`Failed to start game: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [guessGame.address, guessGame.abi, ethersSigner, refreshGameSession]
  );

  // Make guess
  const makeGuess = useCallback(
    async (guess: number) => {
      if (isGuessingRef.current || !guessGame.address || !instance || !ethersSigner) {
        return;
      }

      isGuessingRef.current = true;
      setIsGuessing(true);
      setMessage(`Encrypting guess ${guess}...`);

      const thisChainId = chainId;
      const thisAddress = guessGame.address;
      const thisEthersSigner = ethersSigner;

      const run = async () => {
        const isStale = () =>
          thisAddress !== guessGameRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          const input = instance.createEncryptedInput(
            thisAddress,
            thisEthersSigner.address
          );
          input.add32(guess);

          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Ignore guess");
            return;
          }

          setMessage("Submitting guess to contract...");

          const contract = new ethers.Contract(
            thisAddress,
            guessGame.abi,
            thisEthersSigner
          );

          const tx = await contract.makeGuess(enc.handles[0], enc.inputProof);
          setMessage(`Waiting for transaction: ${tx.hash}...`);

          const receipt = await tx.wait();
          setMessage("Guess submitted successfully!");

          if (isStale()) return;

          // Get the comparison result handle
          // The makeGuess function returns euint32 which is encoded as bytes (handle)
          // We can get it from getLastComparisonResult or parse from tx result
          try {
            // Wait a bit for the state to update
            await new Promise(resolve => setTimeout(resolve, 1000));
            const resultHandle = await contract.getLastComparisonResult();
            // Clear previous decrypted result when new handle is set
            if (resultHandle !== comparisonResultHandleRef.current) {
              setClearComparisonResult(undefined);
              clearComparisonResultRef.current = undefined;
            }
            comparisonResultHandleRef.current = resultHandle;
            setComparisonResultHandle(resultHandle);
          } catch (e) {
            console.warn("Could not get comparison result handle:", e);
            // Retry after a delay
            setTimeout(async () => {
              try {
                const resultHandle = await contract.getLastComparisonResult();
                // Clear previous decrypted result when new handle is set
                if (resultHandle !== comparisonResultHandleRef.current) {
                  setClearComparisonResult(undefined);
                  clearComparisonResultRef.current = undefined;
                }
                comparisonResultHandleRef.current = resultHandle;
                setComparisonResultHandle(resultHandle);
              } catch (err) {
                console.error("Failed to get comparison result:", err);
              }
            }, 2000);
          }

          refreshGameSession();
        } catch (error: any) {
          setMessage(`Guess failed: ${error.message}`);
        } finally {
          isGuessingRef.current = false;
          setIsGuessing(false);
        }
      };

      run();
    },
    [
      guessGame.address,
      guessGame.abi,
      instance,
      ethersSigner,
      chainId,
      sameChain,
      sameSigner,
      refreshGameSession,
    ]
  );

  // Decrypt comparison result
  const decryptComparisonResult = useCallback(() => {
    if (isDecryptingRef.current || !comparisonResultHandle || !instance || !ethersSigner || !guessGame.address) {
      return;
    }

    if (comparisonResultHandle === clearComparisonResultRef.current?.handle) {
      return;
    }

    if (comparisonResultHandle === ethers.ZeroHash) {
      setClearComparisonResult({ handle: comparisonResultHandle, clear: BigInt(0) });
      clearComparisonResultRef.current = { handle: comparisonResultHandle, clear: BigInt(0) };
      return;
    }

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Decrypting comparison result...");

    const thisChainId = chainId;
    const thisAddress = guessGame.address;
    const thisHandle = comparisonResultHandle;
    const thisEthersSigner = ethersSigner;

    const run = async () => {
      const isStale = () =>
        thisAddress !== guessGameRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [guessGame.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore decryption");
          return;
        }

        if (!thisAddress) {
          setMessage("Contract address not available");
          return;
        }

        const res = await instance.userDecrypt(
          [{ handle: thisHandle, contractAddress: thisAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (isStale()) return;

        setClearComparisonResult({ handle: thisHandle, clear: res[thisHandle] });
        clearComparisonResultRef.current = {
          handle: thisHandle,
          clear: res[thisHandle],
        };

        const result = Number(res[thisHandle]);
        let resultText = "";
        if (result === 0) resultText = "Your guess is too small";
        else if (result === 1) resultText = "Congratulations! You guessed correctly!";
        else if (result === 2) resultText = "Your guess is too large";

        setMessage(resultText);
      } catch (error: any) {
        setMessage(`Decryption failed: ${error.message}`);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    comparisonResultHandle,
    instance,
    ethersSigner,
    guessGame.address,
    chainId,
    sameChain,
    sameSigner,
    fhevmDecryptionSignatureStorage,
  ]);

  // Finish game
  const finishGame = useCallback(async () => {
    if (!guessGame.address || !ethersSigner) {
      return;
    }

    setIsLoading(true);
    setMessage("Finishing game and calculating score...");

    try {
      const contract = new ethers.Contract(
        guessGame.address!,
        guessGame.abi,
        ethersSigner
      );

      const tx = await contract.finishGame();
      await tx.wait();
      setMessage("Game finished! Score calculated.");

      // Get encrypted score
      const scoreHandle = await contract.getEncryptedScore();
      setScoreHandle(scoreHandle);

      refreshGameSession();
    } catch (error: any) {
      setMessage(`Failed to finish game: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [guessGame.address, guessGame.abi, ethersSigner, refreshGameSession]);

  // Decrypt score
  const decryptScore = useCallback(() => {
    if (isDecryptingRef.current || !scoreHandle || !instance || !ethersSigner || !guessGame.address) {
      return;
    }

    if (scoreHandle === clearScoreRef.current?.handle) {
      return;
    }

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Decrypting score...");

    const thisChainId = chainId;
    const thisAddress = guessGame.address;
    const thisHandle = scoreHandle;
    const thisEthersSigner = ethersSigner;

    const run = async () => {
      const isStale = () =>
        thisAddress !== guessGameRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [guessGame.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore decryption");
          return;
        }

        if (!thisAddress) {
          setMessage("Contract address not available");
          return;
        }

        const res = await instance.userDecrypt(
          [{ handle: thisHandle, contractAddress: thisAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (isStale()) return;

        setClearScore({ handle: thisHandle, clear: res[thisHandle] });
        clearScoreRef.current = {
          handle: thisHandle,
          clear: res[thisHandle],
        };

        const rawScore = res[thisHandle] as unknown as number | string | bigint;
        const scoreNum = typeof rawScore === "bigint" ? Number(rawScore) : Number(rawScore as any);
        setMessage(
          `Your final score: ${Number.isFinite(scoreNum) ? scoreNum.toFixed(3) : String(rawScore)}`
        );
      } catch (error: any) {
        setMessage(`Score decryption failed: ${error.message}`);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    scoreHandle,
    instance,
    ethersSigner,
    guessGame.address,
    chainId,
    sameChain,
    sameSigner,
    fhevmDecryptionSignatureStorage,
  ]);

  // Abort game (end without scoring)
  const abortGame = useCallback(async () => {
    if (!guessGame.address || !ethersSigner) {
      return;
    }

    setIsLoading(true);
    setMessage("Aborting game...");

    try {
      const contract = new ethers.Contract(
        guessGame.address!,
        guessGame.abi,
        ethersSigner
      );

      const tx = await contract.abortGame();
      await tx.wait();
      setMessage("Game aborted.");

      // Clear comparison and score handles/results in UI
      setComparisonResultHandle(undefined);
      comparisonResultHandleRef.current = undefined;
      setClearComparisonResult(undefined);
      clearComparisonResultRef.current = undefined;
      setScoreHandle(undefined);
      setClearScore(undefined);

      refreshGameSession();
    } catch (error: any) {
      setMessage(`Failed to abort game: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [guessGame.address, guessGame.abi, ethersSigner, refreshGameSession]);

  return {
    contractAddress: guessGame.address,
    isDeployed,
    gameSession,
    comparisonResultHandle,
    clearComparisonResult,
    scoreHandle,
    clearScore,
    message,
    isLoading,
    isDecrypting,
    isGuessing,
    startGame,
    makeGuess,
    decryptComparisonResult,
    finishGame,
    decryptScore,
    refreshGameSession,
    abortGame,
  };
};

