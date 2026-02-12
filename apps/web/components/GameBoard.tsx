import { useState } from "react";
import { GameState, ROLES } from "@operative/shared";
import GameCard from "./GameCard";
import { useSocket } from "../context/SocketContext";

interface GameBoardProps {
  gameState: GameState;
}

export default function GameBoard({ gameState }: GameBoardProps) {
  const { socket } = useSocket();
  const [clueWord, setClueWord] = useState("");
  const [clueNum, setClueNum] = useState("1");
  const [copied, setCopied] = useState(false);

  // Identify WHO I am
  const myPlayer = gameState.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState.turn === myPlayer?.team;
  const isSpymaster = myPlayer?.role === ROLES.SPYMASTER;
  const isHost = gameState.players[0]?.id === myPlayer?.id;

  // Spymaster "View Mode" is now forced if you ARE a spymaster, 
  // or optional if you are an operative checking the board.
  const [viewAsSpymaster, setViewAsSpymaster] = useState(false);
  const showSpymasterView = isSpymaster || viewAsSpymaster;

  const handleCardClick = (cardId: string) => {
    // Only Operatives can click cards, and only on their turn
    if (!socket || isSpymaster || !isMyTurn || !gameState.currentClue) return;
    
    socket.emit("reveal_card", { 
      roomCode: gameState.roomCode, 
      cardId 
    });
  };

  const submitClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !clueWord) return;
    socket.emit("give_clue", { word: clueWord, number: parseInt(clueNum) });
    setClueWord("");
  };

  const endTurn = () => {
    if (!socket) return;
    socket.emit("end_turn");
  };

  const handleRestart = () => {
    if (!socket) return;
    if (confirm("Reset mission?")) socket.emit("restart_game", gameState.roomCode);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 flex flex-col items-center">
      
      {/* --- ACTION BAR (The most important part) --- */}
      <div className="w-full max-w-3xl mb-6 min-h-[80px] flex items-center justify-center">
        
        {/* CASE 1: GAME OVER */}
        {gameState.phase === "game_over" && (
           <div className={`
             w-full px-8 py-6 rounded-xl text-2xl md:text-4xl font-black tracking-widest text-center animate-bounce shadow-2xl
             ${gameState.winner === "red" ? "bg-red-600 text-white" : "bg-blue-600 text-white"}
           `}>
             MISSION COMPLETE: {gameState.winner?.toUpperCase()} WINS!
           </div>
        )}

        {/* CASE 2: PLAYING - MY TURN - SPYMASTER (Give Clue) */}
        {gameState.phase === "playing" && isMyTurn && isSpymaster && !gameState.currentClue && (
          <form onSubmit={submitClue} className="flex gap-2 w-full bg-neutral-800 p-2 rounded-lg border border-neutral-600">
            <input 
              type="text" 
              placeholder="CLUE WORD" 
              value={clueWord}
              onChange={e => setClueWord(e.target.value.toUpperCase().trim())}
              className="flex-1 bg-neutral-900 text-white px-4 py-2 rounded font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-white"
              autoFocus
            />
            <select 
              value={clueNum}
              onChange={e => setClueNum(e.target.value)}
              className="bg-neutral-900 text-white px-4 py-2 rounded font-bold focus:outline-none"
            >
              {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
              <option value="0">0</option>
              <option value="99">∞</option>
            </select>
            <button type="submit" className="bg-white text-black px-6 py-2 rounded font-black hover:bg-neutral-200">
              TRANSMIT
            </button>
          </form>
        )}

        {/* CASE 3: PLAYING - MY TURN - OPERATIVE (Guessing) */}
        {gameState.phase === "playing" && isMyTurn && !isSpymaster && gameState.currentClue && (
          <div className="flex items-center gap-4 w-full justify-between bg-neutral-800/50 p-4 rounded-lg border border-white/20">
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400 tracking-widest">ACTIVE CLUE</span>
              <div className="text-3xl font-black text-white leading-none">
                {gameState.currentClue.word} <span className="text-neutral-500">/</span> {gameState.currentClue.number}
              </div>
            </div>
            <button onClick={endTurn} className="bg-neutral-700 hover:bg-red-600 text-white px-6 py-3 rounded font-bold transition-colors">
              END TURN
            </button>
          </div>
        )}

        {/* CASE 4: PLAYING - WAITING (Not My Turn / Waiting for Clue) */}
        {gameState.phase === "playing" && (!isMyTurn || (!gameState.currentClue && !isSpymaster)) && (
          <div className="flex items-center gap-3 animate-pulse">
            <div className={`w-3 h-3 rounded-full ${gameState.turn === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
            <span className="text-neutral-400 font-mono tracking-widest uppercase">
              WAITING FOR {gameState.turn} {(!gameState.currentClue ? "SPYMASTER" : "OPERATIVES")}...
            </span>
            {gameState.currentClue && (
               <span className="text-white font-bold ml-2">
                 CLUE: {gameState.currentClue.word} ({gameState.currentClue.number})
               </span>
            )}
          </div>
        )}
      </div>


      {/* --- Scoreboard & Grid --- */}
      <div className="w-full flex justify-between items-center mb-6 px-4 font-mono text-xl md:text-3xl">
        <div className={`font-black transition-all ${gameState.turn === 'red' ? 'text-red-500 scale-110' : 'text-red-900/50'}`}>
          RED: {gameState.scores.red}
        </div>
        
        <button onClick={copyCode} className="flex flex-col items-center group">
          <div className="text-[10px] md:text-xs text-neutral-600 tracking-[0.2em] mb-1 group-hover:text-neutral-400">
            {copied ? "COPIED!" : "SECURE CHANNEL"}
          </div>
          <div className="bg-neutral-900 px-6 py-2 rounded border border-neutral-800 text-white font-mono font-bold tracking-widest text-lg">
            {gameState.roomCode}
          </div>
        </button>
        
        <div className={`font-black transition-all ${gameState.turn === 'blue' ? 'text-blue-500 scale-110' : 'text-blue-900/50'}`}>
          BLUE: {gameState.scores.blue}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 md:gap-3 w-full max-w-3xl">
        {gameState.board.map((card) => (
          <GameCard
            key={card.id}
            card={card}
            onClick={() => handleCardClick(card.id)}
            disabled={gameState.phase === "game_over" || (isMyTurn && !isSpymaster && !gameState.currentClue)}
            isSpymaster={showSpymasterView}
          />
        ))}
      </div>

      {/* --- Footer Controls --- */}
      <div className="w-full max-w-3xl mt-8 flex justify-between items-start">
        <div className="w-2/3 bg-neutral-950/50 rounded-lg p-2 h-32 overflow-y-auto border border-neutral-800 font-mono text-xs text-neutral-400">
          {gameState.logs.slice().reverse().map((log, i) => (
            <div key={i} className="mb-1">{">"} {log}</div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
           {!isSpymaster && (
             <button 
               onClick={() => setViewAsSpymaster(!viewAsSpymaster)}
               className="text-[10px] text-neutral-600 hover:text-white border border-neutral-800 px-3 py-2 rounded"
             >
               {viewAsSpymaster ? "HIDE CHEAT SHEET" : "VIEW CHEAT SHEET"}
             </button>
           )}
           {isHost && (
             <button 
               onClick={handleRestart}
               className="text-[10px] text-red-900 hover:text-red-500 border border-neutral-800 px-3 py-2 rounded"
             >
               RESET MISSION
             </button>
           )}
        </div>
      </div>
    </div>
  );
}
