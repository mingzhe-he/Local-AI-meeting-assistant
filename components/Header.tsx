import React from 'react';
import { RobotIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 shadow-md p-4 flex items-center space-x-4 border-b border-gray-700">
        <div className="p-2 bg-blue-600 rounded-lg">
            <RobotIcon className="w-6 h-6 text-white" />
        </div>
      <h1 className="text-xl md:text-2xl font-bold text-white">
        AI Meeting Assistant
      </h1>
      <span className="text-xs font-mono bg-blue-900/50 text-blue-300 px-2 py-1 rounded-md">MVP Demo</span>
    </header>
  );
};
