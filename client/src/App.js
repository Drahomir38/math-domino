import React, { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import './App.css';

function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | game | gameover
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState(''); // eslint-disable-line no-unused-vars
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({ operations: ['+'] });
  const [hand, setHand] = useState([]);
  const [publicState, setPublicState] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');

  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }, []);

  useEffect(() => {
    socket.connect();

    socket.on('roomUpdate', ({ players, host, settings }) => {
      setPlayers(players);
      setIsHost(host === socket.id);
      setSettings(settings);
    });

    socket.on('settingsUpdate', (s) => setSettings(s));

    socket.on('gameStarted', ({ hand, publicState, players, playerId }) => {
      setHand(hand);
      setPublicState(publicState);
      setPlayers(players);
      setPlayerId(playerId);
      setScreen('game');
    });

    socket.on('boardUpdate', ({ publicState }) => {
      setPublicState(publicState);
    });

    socket.on('handUpdate', ({ hand }) => {
      setHand(hand);
    });

    socket.on('gameOver', (data) => {
      setGameOverData(data);
      setScreen('gameover');
    });

    socket.on('notification', ({ message }) => {
      showNotification(message);
    });

    socket.on('playerDisconnected', ({ playerName }) => {
      showNotification(`${playerName} se odpojil/a`);
    });

    socket.on('gameReset', ({ players, host, settings }) => {
      setPlayers(players);
      setIsHost(host === socket.id);
      setSettings(settings);
      setHand([]);
      setPublicState(null);
      setGameOverData(null);
      setScreen('lobby');
    });

    socket.on('reconnected', ({ playerId, hand, publicState, players }) => {
      setPlayerId(playerId);
      setHand(hand);
      setPublicState(publicState);
      setPlayers(players);
      setScreen('game');
    });

    return () => {
      socket.off('roomUpdate');
      socket.off('settingsUpdate');
      socket.off('gameStarted');
      socket.off('boardUpdate');
      socket.off('handUpdate');
      socket.off('gameOver');
      socket.off('notification');
      socket.off('playerDisconnected');
      socket.off('gameReset');
      socket.off('reconnected');
    };
  }, [showNotification]);

  const joinRoom = useCallback((name, room) => {
    setPlayerName(name);
    setRoomId(room);
    socket.emit('joinRoom', { roomId: room, playerName: name }, (res) => {
      if (res.error) {
        setError(res.error);
      } else {
        setPlayerId(res.playerId);
        setIsHost(res.isHost);
        setError('');
      }
    });
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    socket.emit('updateSettings', { roomId, settings: newSettings });
  }, [roomId]);

  const startGame = useCallback(() => {
    socket.emit('startGame', { roomId }, (res) => {
      if (res.error) setError(res.error);
    });
  }, [roomId]);

  const placeTile = useCallback((tileId, end, flipped) => {
    socket.emit('placeTile', { roomId, tileId, end, flipped }, (res) => {
      if (res.error) showNotification(res.error);
    });
  }, [roomId, showNotification]);

  const passTurn = useCallback(() => {
    socket.emit('passTurn', { roomId }, (res) => {
      if (res.error) showNotification(res.error);
    });
  }, [roomId, showNotification]);

  const restartGame = useCallback(() => {
    socket.emit('restartGame', { roomId }, (res) => {
      if (res?.error) setError(res.error);
    });
  }, [roomId]);

  return (
    <div className="App">
      {notification && <div className="global-notification">{notification}</div>}

      {screen === 'lobby' && (
        <LobbyScreen
          players={players}
          isHost={isHost}
          settings={settings}
          error={error}
          onJoin={joinRoom}
          onUpdateSettings={updateSettings}
          onStartGame={startGame}
          playerId={playerId}
        />
      )}

      {screen === 'game' && publicState && (
        <GameScreen
          hand={hand}
          publicState={publicState}
          players={players}
          playerId={playerId}
          isMyTurn={publicState.currentPlayerId === playerId}
          onPlaceTile={placeTile}
          onPassTurn={passTurn}
        />
      )}

      {screen === 'gameover' && (
        <GameOverScreen
          data={gameOverData}
          players={players}
          playerId={playerId}
          isHost={isHost}
          onRestart={restartGame}
        />
      )}
    </div>
  );
}

export default App;
