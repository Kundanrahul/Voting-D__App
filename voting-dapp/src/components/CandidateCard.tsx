"use client";

import React from "react";

interface CandidateCardProps {
  name: string;
  image: string;
  voteCount: number;
  onVote?: () => void;
  onRemove?: () => void;
  voted?: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  name,
  image,
  voteCount,
  onVote,
  onRemove,
  voted = false,
}) => {
  return (
    <div
      className={`relative w-72 mt-4 rounded-2xl p-6 flex flex-col items-center text-center border border-gray-700 
      bg-gray-800 shadow-lg transition-all duration-300 
      ${
        voted
          ? "ring-2 ring-indigo-300 shadow-indigo-500/40 animate-pulse-glow"
          : "hover:shadow-xl hover:shadow-indigo-500/20"
      }`}
    >
      {/* Candidate Image */}
      <img
        src={image}
        alt={name}
        className="w-28 h-28 rounded-full object-cover mb-4 border-2 border-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 p-0.5"
      />
      {/* Candidate Name */}
      <h2 className="text-lg font-bold text-white">{name}</h2>
      {/* Vote Count */}
      <p className="text-sm text-gray-300 mt-2">Votes: {voteCount}</p>
      {/* Action Buttons / Voted Badge */}
      <div className="flex gap-2 mt-4 justify-center w-full min-h-[40px]">
        {/* Cast Vote Button */}
        {onVote && !voted && (
          <button
            onClick={onVote}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600
                       text-white font-bold rounded-xl shadow-lg hover:scale-105 hover:shadow-xl
                       active:scale-95 transition-all duration-200"
          >
            Cast Vote
          </button>
        )}
        {/* Remove Button (Admin Only) */}
        {onRemove && (
          <button
            onClick={onRemove}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
            title="Remove Candidate"
          >
            🗑️
          </button>
        )}

        {/* Voted Badge */}
        {voted && (
          <span className="px-4 py-2 bg-gray-600 text-white font-bold rounded-xl shadow-inner text-sm">
            Voted!
          </span>
        )}
      </div>
    </div>
  );
};
export default CandidateCard;



