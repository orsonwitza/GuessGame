// Auto-generated file - do not edit manually
// Generated from contract: GuessGame

export const GuessGameABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "attemptCount",
        "type": "uint256"
      }
    ],
    "name": "GameAborted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "attemptCount",
        "type": "uint256"
      }
    ],
    "name": "GameFinished",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "minRange",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "maxRange",
        "type": "uint256"
      }
    ],
    "name": "GameStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "attemptCount",
        "type": "uint256"
      }
    ],
    "name": "GuessMade",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "abortGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "finishGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "gameSessions",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "enc_secret",
        "type": "bytes"
      },
      {
        "internalType": "uint256",
        "name": "minRange",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxRange",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "attemptCount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "enc_score",
        "type": "bytes"
      },
      {
        "internalType": "bool",
        "name": "finished",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getEncryptedScore",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "encScore",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getGameSession",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "minRange",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxRange",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "attemptCount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "finished",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLastComparisonResult",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "encResult",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "lastComparisonResults",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint32",
        "name": "guessEuint32",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "makeGuess",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "encResult",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "minRange",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxRange",
        "type": "uint256"
      }
    ],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export type GuessGameABI = typeof GuessGameABI;
