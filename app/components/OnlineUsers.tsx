// Why: Component to list online users with call buttons. Responsive for mobile.
import { UserCircleIcon, PhoneIcon } from '@heroicons/react/24/solid';

interface OnlineUsersProps {
  users: { userId: string; name: string }[];
  onCall: (calleeId: string) => void;
}

export default function OnlineUsers({ users, onCall }: OnlineUsersProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <UserCircleIcon className="w-12 h-12 mb-2 text-gray-300" />
        <p className="text-sm font-medium">No one else is online right now.</p>
        <p className="text-xs mt-1 text-gray-400">Invite friends to start calling!</p>
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
                  <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white"></span>
                </div>
                
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800 text-sm md:text-base">{user.name || 'Unknown User'}</span>
                  <span className="text-xs text-green-600 font-medium bg-green-50 w-fit px-2 py-0.5 rounded-full">Available</span>
                </div>
            </div>

            <button 
              onClick={() => onCall(user.userId)} 
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg transition-all duration-200 font-medium text-sm group-hover:shadow-indigo-200 group-hover:shadow-lg"
            >
              <PhoneIcon className="w-4 h-4" />
              <span>Call</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}