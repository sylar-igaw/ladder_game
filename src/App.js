import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const pastelColors = ['#FFDDC1', '#C1FFD7', '#D1C1FF', '#FFFDC1', '#C1EFFF', '#FFC1E1', '#E1FFC1', '#C1D7FF'];

function App() {
  const [gameState, setGameState] = useState('setup');
  const [numPlayers, setNumPlayers] = useState(2);
  const [players, setPlayers] = useState(['참가자 1', '참가자 2']);
  const [results, setResults] = useState([]);
  const [ladder, setLadder] = useState([]);
  const [revealedResults, setRevealedResults] = useState({});
  
  const canvasRef = useRef(null);
  const ladderContainerRef = useRef(null);
  const animationStateRef = useRef(null);

  const draw = useCallback((pathsToDraw = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (gameState === 'setup' || ladder.length === 0) return;

    const colWidth = width / numPlayers;

    ctx.strokeStyle = '#A0A0A0';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;

    for (let i = 0; i < numPlayers; i++) {
      const x = colWidth * (i + 0.5);
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, height - 10);
      ctx.stroke();
    }

    ladder.forEach(({ startCol, y }) => {
      const x1 = colWidth * (startCol + 0.5);
      const x2 = colWidth * (startCol + 1.5);
      const yPos = y * height;
      ctx.beginPath();
      ctx.moveTo(x1, yPos);
      ctx.lineTo(x2, yPos);
      ctx.stroke();
    });
    
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 5;

    for (const playerIndex in pathsToDraw) {
      const color = pastelColors[playerIndex % pastelColors.length];
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      const path = pathsToDraw[playerIndex];
      ctx.beginPath();
      path.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }, [ladder, numPlayers, gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = ladderContainerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      const newWidth = container.clientWidth > 0 ? container.clientWidth : 300;
      canvas.width = newWidth;
      canvas.height = 400;
      if (animationStateRef.current) {
        draw(animationStateRef.current.paths);
      } else {
        draw();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    if (animationStateRef.current) {
      draw(animationStateRef.current.paths);
    }
  }, [players, ladder, draw]);
  
  useEffect(() => {
      if (gameState === 'playing' && players.length > 0 && Object.keys(revealedResults).length === players.length) {
          setGameState('finished');
      }
  }, [revealedResults, players, gameState]);

  useEffect(() => {
    setPlayers(prevPlayers => {
      const currentLength = prevPlayers.length;
      if (currentLength === numPlayers) return prevPlayers;
      
      const newPlayers = [...prevPlayers];
      if (numPlayers > currentLength) {
        for (let i = currentLength; i < numPlayers; i++) {
          newPlayers.push(`참가자 ${i + 1}`);
        }
      }
      return newPlayers.slice(0, numPlayers);
    });
  }, [numPlayers]);

  const animate = useCallback(() => {
    const animState = animationStateRef.current;
    if (!animState || !animState.active) return;

    let allDone = true;
    const currentPaths = animState.paths;

    for (const pIndex in animState.animations) {
      const anim = animState.animations[pIndex];
      if (anim.isFinished) continue;

      allDone = false;
      const { fullPath, segment, speed } = anim;
      const start = fullPath[segment];
      const end = fullPath[segment + 1];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < speed) {
          anim.progress = 0;
          anim.segment++;
          if (anim.segment >= fullPath.length - 1) {
              anim.isFinished = true;
              currentPaths[pIndex] = fullPath;
              setRevealedResults(prev => ({ ...prev, [pIndex]: anim.result }));
          }
      } else {
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
            currentPaths[pIndex] = fullPath;
            setRevealedResults(prev => ({ ...prev, [pIndex]: anim.result }));
          }
        }
      }
    }

    draw(currentPaths);

    if (!allDone) {
      animState.requestId = requestAnimationFrame(animate);
    } else {
      animState.active = false;
    }
  }, [draw]);

  useEffect(() => {
    if (gameState !== 'playing' || !ladder.length || !results.length) {
      return;
    }

    const startPlayerAnimation = (playerIndex) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
  
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
  
      let totalDistance = 0;
      for (let i = 0; i < fullPath.length - 1; i++) {
          const p1 = fullPath[i];
          const p2 = fullPath[i+1];
          totalDistance += Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
      }
  
      const animationDuration = 2000;
      const frames = (animationDuration / 1000) * 60;
  
      animationStateRef.current.animations[playerIndex] = {
        fullPath,
        segment: 0,
        progress: 0,
        isFinished: false,
        resultIndex: currentColumn,
        result: results[currentColumn],
        speed: totalDistance > 0 ? totalDistance / frames : 1,
      };
  
      if (!animationStateRef.current.active) {
        animationStateRef.current.active = true;
        animationStateRef.current.requestId = requestAnimationFrame(animate);
      }
    };

    players.forEach((_, index) => {
        setTimeout(() => {
            startPlayerAnimation(index);
        }, index * 200); 
    });

    return () => {
      if (animationStateRef.current && animationStateRef.current.requestId) {
        cancelAnimationFrame(animationStateRef.current.requestId);
      }
    };
  }, [gameState, players, ladder, numPlayers, results, animate]);

  const startGame = () => {
    const newResults = Array(numPlayers).fill('꽝');
    const winnerIndex = Math.floor(Math.random() * numPlayers);
    newResults[winnerIndex] = '당첨';
    const shuffledResults = [...newResults].sort(() => Math.random() - 0.5);

    const minRungs = numPlayers * 5;
    const maxRungs = numPlayers * 8;
    const numRungs = Math.floor(Math.random() * (maxRungs - minRungs + 1)) + minRungs;

    const newLadder = [];
    const availableRungs = [];
    const yCoords = Array.from({length: 15}, (_, i) => (i + 1) / 16);

    for (let i = 0; i < numPlayers - 1; i++) {
        yCoords.forEach(y => {
            availableRungs.push({ startCol: i, y });
        });
    }

    for (let i = availableRungs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableRungs[i], availableRungs[j]] = [availableRungs[j], availableRungs[i]];
    }

    const finalRungs = [];
    const occupiedY = new Set();
    for(const rung of availableRungs) {
        if(finalRungs.length >= numRungs) break;
        const yKey = Math.floor(rung.y * 16);
        if(!occupiedY.has(`${rung.startCol}-${yKey}`) && !occupiedY.has(`${rung.startCol + 1}-${yKey}`) && !occupiedY.has(`${rung.startCol - 1}-${yKey}`)) {
            finalRungs.push(rung);
            occupiedY.add(`${rung.startCol}-${yKey}`);
        }
    }

    setRevealedResults({});
    animationStateRef.current = { paths: {}, animations: {}, active: false, requestId: null };
    
    setResults(shuffledResults);
    setLadder(finalRungs);
    setGameState('playing');
  };
  
  const handlePlayerChange = (index, value) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

  const restartGame = () => {
    if (animationStateRef.current && animationStateRef.current.requestId) {
      cancelAnimationFrame(animationStateRef.current.requestId);
    }
    setGameState('setup');
    setNumPlayers(2);
    setPlayers(['참가자 1', '참가자 2']);
    setResults([]);
    setLadder([]);
    setRevealedResults({});
    animationStateRef.current = null;
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
            <div key={index} className="player-name">
              <div 
                className="player-label"
                style={{color: pastelColors[index % pastelColors.length]}}
              >
                {player}
              </div>
            </div>
          ))}
        </div>
        <canvas ref={canvasRef}></canvas>
        <div className="results-container">
          {results.map((_, index) => {
            const revealedAnim = animationStateRef.current && Object.values(animationStateRef.current.animations).find(a => a.resultIndex === index && a.isFinished);
            return (
              <div key={index} className="result-item">
                {revealedAnim ? revealedAnim.result : '?'}
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
            {players.map((player, index) => {
              const finalResult = revealedResults[index] || '...';
              return (
                <li className="list-group-item" key={index} style={{backgroundColor: pastelColors[index % pastelColors.length]}}>
                  {player} -> <strong>{finalResult}</strong>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
