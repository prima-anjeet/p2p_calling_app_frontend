// Why: Component to list all users with call buttons. Responsive for mobile.
import { UserCircleIcon, PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/solid';

interface User {
  userId: string;
  name: string;
  email?: string;
  isOnline: boolean;
}

interface OnlineUsersProps {
  users: User[];
  onCall: (calleeId: string, type: 'audio' | 'video') => void;
}

export default function OnlineUsers({ users, onCall }: OnlineUsersProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <UserCircleIcon className="w-12 h-12 mb-2 text-gray-300" />
        <p className="text-sm font-medium">No other users found.</p>
        <p className="text-xs mt-1 text-gray-400">Invite friends to join!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
        {users.map((user, index) => (
          <div 
            key={user.userId} 
            className="group relative bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
                {/* Avatar Placeholder */}
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm
                    ${['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'][index % 5]}
                  `}>
                    {user.name ? user.name.substring(0, 2).toUpperCase() : '??'}
                  </div>
                  {user.isOnline ? (
                    <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white" title="Online"></span>
                  ) : (
                    <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-gray-400 ring-2 ring-white" title="Offline"></span>
                  )}
                  
                </div>
                
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800 text-sm md:text-base">{user.name || 'Unknown User'}</span>
                  {user.isOnline ? (
                    <span className="text-xs text-green-600 font-medium bg-green-50 w-fit px-2 py-0.5 rounded-full">Available</span>
                  ) : (
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 w-fit px-2 py-0.5 rounded-full">Offline</span>
                  )}
                </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => onCall(user.userId, 'audio')} 
                className={`flex items-center justify-center p-2 rounded-lg transition-all duration-200 font-medium text-sm transition-colors border
                    ${user.isOnline 
                        ? 'bg-white border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 hover:shadow-sm' 
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}
                `}
                title="Audio Call"
              >
                <PhoneIcon className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => onCall(user.userId, 'video')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm hover:shadow-lg
                    ${user.isOnline 
                        ? 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white group-hover:shadow-indigo-200' 
                        : 'bg-gray-50 hover:bg-gray-200 text-gray-600 border border-gray-200'}
                `}
                title={user.isOnline ? "Video Call" : "Notify User"}
              >
                <VideoCameraIcon className="w-5 h-5" />
                <span className="hidden sm:inline">{user.isOnline ? 'Video' : 'Notify'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}