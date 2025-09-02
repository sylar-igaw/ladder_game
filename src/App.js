import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const pastelColors = ['#FFDDC1', '#C1FFD7', '#D1C1FF', '#FFFDC1', '#C1EFFF', '#FFC1E1', '#E1FFC1', '#C1D7FF'];

function App() {
  const [gameState, setGameState] = useState('setup');
  const [numPlayers, setNumPlayers] = useState(2);
  const [numRungs, setNumRungs] = useState(10);
  const [players, setPlayers] = useState(['참가자 1', '참가자 2']);
  const [results, setResults] = useState([]);
  const [ladder, setLadder] = useState([]);
  const [revealedResults, setRevealedResults] = useState({});
  const canvasRef = useRef(null);
  const ladderContainerRef = useRef(null);
  const animationRef = useRef({
    paths: {},
    active: false
  });

  const draw = useCallback((pathsToDraw) => {
    const canvas = canvasRef.current;
    if (!canvas || !ladder.length) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const colWidth = width / numPlayers;

    // Style for ladder lines
    ctx.strokeStyle = '#A0A0A0';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;

    // Draw vertical lines
    for (let i = 0; i < numPlayers; i++) {
      const x = colWidth * (i + 0.5);
      ctx.beginPath();
      ctx.moveTo(x, 10); // Start a bit lower
      ctx.lineTo(x, height - 10); // End a bit higher
      ctx.stroke();
    }

    // Draw rungs
    ladder.forEach(({ startCol, y }) => {
      const x1 = colWidth * (startCol + 0.5);
      const x2 = colWidth * (startCol + 1.5);
      const yPos = y * height;
      ctx.beginPath();
      ctx.moveTo(x1, yPos);
      ctx.lineTo(x2, yPos);
      ctx.stroke();
    });
    
    // Reset shadow for traced paths
    ctx.shadowColor = 'transparent';

    // Draw traced paths
    ctx.lineWidth = 5;
    for (const playerIndex in pathsToDraw) {
      const color = pastelColors[playerIndex % pastelColors.length];
      ctx.strokeStyle = color;
      
      // Glowing effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      const path = pathsToDraw[playerIndex];
      ctx.beginPath();
      path.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Reset shadow for the next path
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }, [ladder, numPlayers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = ladderContainerRef.current;
    if (!canvas || !container || gameState !== 'playing') return;

    const handleResize = () => {
      canvas.width = container.clientWidth;
      canvas.height = 400;
      draw(animationRef.current.paths);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw, gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      draw(animationRef.current.paths);
    }
  }, [players, ladder, draw, gameState]);
  
  useEffect(() => {
      if (gameState === 'playing' && players.length > 0 && Object.keys(revealedResults).length === players.length) {
          setGameState('finished');
      }
  }, [revealedResults, players, gameState]);

  useEffect(() => {
    if (gameState === 'setup') {
      const newPlayers = [...players];
      while (newPlayers.length < numPlayers) {
        newPlayers.push(`참가자 ${newPlayers.length + 1}`);
      }
      setPlayers(newPlayers.slice(0, numPlayers));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPlayers, gameState]);


  const animate = useCallback(() => {
    if (!animationRef.current.active) return;

    let allDone = true;
    const currentPaths = animationRef.current.paths;

    for (const pIndex in animationRef.current) {
      if (pIndex === 'paths' || pIndex === 'active') continue;
      const anim = animationRef.current[pIndex];
      if (anim.isFinished) continue;

      allDone = false;
      const { fullPath, segment } = anim;
      const speed = 6;

      const start = fullPath[segment];
      const end = fullPath[segment + 1];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      const totalSteps = distance / speed;

      anim.progress += 1;
      const newX = start[0] + (dx * (anim.progress / totalSteps));
      const newY = start[1] + (dy * (anim.progress / totalSteps));

      const drawnPath = fullPath.slice(0, anim.segment + 1);
      drawnPath.push([newX, newY]);
      currentPaths[pIndex] = drawnPath;

      if (anim.progress >= totalSteps) {
        anim.progress = 0;
        anim.segment++;
        if (anim.segment >= fullPath.length - 1) {
          anim.isFinished = true;
          currentPaths[pIndex] = fullPath; // Ensure final path is complete
          setRevealedResults(prev => ({ ...prev, [pIndex]: results[anim.resultIndex] }));
        }
      }
    }

    draw(currentPaths);

    if (!allDone) {
      requestAnimationFrame(animate);
    } else {
      animationRef.current.active = false;
    }
  }, [draw, results]);

  const handlePlayerClick = (playerIndex) => {
    if (animationRef.current[playerIndex] || gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const { width, height } = canvas;
    const colWidth = width / numPlayers;
    let currentColumn = playerIndex;
    const fullPath = [[colWidth * (playerIndex + 0.5), 0]];
    const sortedLadder = [...ladder].sort((a, b) => a.y - b.y);

    sortedLadder.forEach(({ startCol, y }) => {
        const yPos = y * height;
        const currentX = colWidth * (currentColumn + 0.5);
        if (fullPath[fullPath.length - 1][1] < yPos) {
            if (currentColumn === startCol) {
                fullPath.push([currentX, yPos]);
                fullPath.push([colWidth * (currentColumn + 1.5), yPos]);
                currentColumn++;
            } else if (currentColumn === startCol + 1) {
                fullPath.push([currentX, yPos]);
                fullPath.push([colWidth * (currentColumn - 0.5), yPos]);
                currentColumn--;
            }
        }
    });
    fullPath.push([colWidth * (currentColumn + 0.5), height]);

    animationRef.current[playerIndex] = {
      fullPath,
      segment: 0,
      progress: 0,
      isFinished: false,
      resultIndex: currentColumn
    };

    if (!animationRef.current.active) {
      animationRef.current.active = true;
      animate();
    }
  };

  const startGame = () => {
    const newResults = Array(numPlayers).fill('꽝');
    const winnerIndex = Math.floor(Math.random() * numPlayers);
    newResults[winnerIndex] = '당첨';
    setResults(newResults);

    const newLadder = [];
    for (let i = 0; i < numRungs; i++) {
      const startCol = Math.floor(Math.random() * (numPlayers - 1));
      const y = Math.random() * 0.8 + 0.1;
      newLadder.push({ startCol, y });
    }
    setLadder(newLadder);
    
    setRevealedResults({});
    animationRef.current = { paths: {}, active: false };
    setGameState('playing');
  };
  
  const handlePlayerChange = (index, value) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

  const restartGame = () => {
    setGameState('setup');
    setNumPlayers(2);
    setPlayers(['참가자 1', '참가자 2']);
  };

  if (gameState === 'setup') {
    return (
      <div className="container mt-5 setup-container">
        <h1 className="text-center mb-4">사다리 게임 설정</h1>
        <div className="form-group">
          <label htmlFor="playerCount">플레이어 수: {numPlayers}</label>
          <input 
            type="range" 
            className="form-range" 
            min="2" 
            max="12" 
            value={numPlayers}
            id="playerCount"
            onChange={(e) => setNumPlayers(parseInt(e.target.value))}
          />
        </div>
        <div className="form-group mt-3">
          <label htmlFor="rungCount">가로줄 개수: {numRungs}</label>
          <input 
            type="range" 
            className="form-range" 
            min="10" 
            max="100" 
            value={numRungs}
            id="rungCount"
            onChange={(e) => setNumRungs(parseInt(e.target.value))}
          />
        </div>

        <div className="form-group mt-4">
          <label>플레이어 이름:</label>
          {players.map((player, index) => (
            <input
              key={index}
              type="text"
              className="form-control mt-2"
              value={player}
              onChange={(e) => handlePlayerChange(index, e.target.value)}
            />
          ))}
        </div>

        <button className="btn btn-primary w-100 mt-4" onClick={startGame}>게임 시작</button>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">사다리 타기 게임</h1>
      
      <div className="ladder-container" ref={ladderContainerRef}>
        <div className="players-container">
          {players.map((player, index) => (
            <div key={index} className="player-name" onClick={() => handlePlayerClick(index)} style={{cursor: 'pointer'}}>
              <div 
                className="form-control text-center"
                style={{borderColor: pastelColors[index % pastelColors.length], borderWidth: '2px', backgroundColor: '#f8f9fa', userSelect: 'none'}}
              >
                {player}
              </div>
            </div>
          ))}
        </div>
        <canvas ref={canvasRef}></canvas>
        <div className="results-container">
          {results.map((result, index) => {
            const revealedPlayer = Object.values(animationRef.current).find(a => a.resultIndex === index && a.isFinished);
            return (
              <div key={index} className="result-item">
                {revealedPlayer ? result : '?'}
              </div>
            );
          })}
        </div>
      </div>

      <div className="d-grid gap-2 my-4">
         <button className="btn btn-secondary" onClick={restartGame}>다시 시작</button>
      </div>

       {gameState === 'finished' && (
        <div className="mt-4">
          <h2>최종 결과</h2>
          <ul className="list-group">
            {players.map((player, index) => (
              <li className="list-group-item" key={index} style={{backgroundColor: pastelColors[index % pastelColors.length]}}>
                {player} -> <strong>{revealedResults[index]}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
