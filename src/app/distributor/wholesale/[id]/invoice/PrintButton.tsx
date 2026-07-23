'use client';

export default function PrintButton() {
    return (
        <button 
            onClick={() => window.print()}
            className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-500"
        >
            Распечатать
        </button>
    );
}
