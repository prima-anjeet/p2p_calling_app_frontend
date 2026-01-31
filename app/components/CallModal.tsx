// Why: Modal for incoming calls with enhanced UI/UX.
import { Dialog } from '@headlessui/react'; // Assuming headlessui is installed, otherwise standard div
import { PhoneIcon, XMarkIcon } from '@heroicons/react/24/solid'; // Assuming heroicons or similar used, or I will use text/svg

interface CallModalProps {
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
  callType?: 'audio' | 'video';
}

export default function CallModal({ callerName, onAccept, onReject, callType = 'video' }: CallModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full transform transition-all border border-gray-100 dark:border-gray-700">
        <div className="text-center space-y-6">
          <div className="relative inline-block">
             <div className="w-24 h-24 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                <span className="text-3xl">{callType === 'audio' ? '🎤' : '📹'}</span>
             </div>
             <span className="absolute top-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
          </div>

          <div>
             <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Incoming {callType === 'audio' ? 'Audio' : 'Video'} Call</h3>
             <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">from <span className="text-indigo-600 dark:text-indigo-400">{callerName}</span></p>
          </div>

          <div className="flex items-center justify-center gap-8 pt-4">
             <div className="flex flex-col items-center gap-2">
               <button 
                onClick={onReject} 
                className="w-16 h-16 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                   <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                 </svg>
               </button>
               <span className="text-xs font-medium text-gray-500">Decline</span>
             </div>

             <div className="flex flex-col items-center gap-2">
               <button 
                onClick={onAccept} 
                className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg animate-pulse"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                   <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
                 </svg>
               </button>
               <span className="text-xs font-medium text-gray-500">Accept</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}