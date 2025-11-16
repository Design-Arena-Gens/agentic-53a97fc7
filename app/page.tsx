'use client';

import { useState } from 'react';
import MindMapEditor from './components/MindMapEditor';
import { Upload, FileText } from 'lucide-react';

export default function Home() {
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process PDF');
      }

      const data = await response.json();
      setMindMapData(data);
    } catch (err) {
      setError('Error processing PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          AI Mind Map Generator
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Convert your PDF notes into interactive mind maps with medical accuracy verification
        </p>

        {!mindMapData ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                  disabled={loading}
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                  ) : (
                    <>
                      <Upload className="w-16 h-16 text-gray-400 mb-4" />
                      <span className="text-xl font-semibold text-gray-700 mb-2">
                        Upload PDF Notes
                      </span>
                      <span className="text-sm text-gray-500">
                        Click to browse or drag and drop
                      </span>
                    </>
                  )}
                </label>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Features:
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    AI-powered extraction of concepts and relationships
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    Medical accuracy verification with web references
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    Interactive editing and reorganization
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    Export to PDF or JPEG with citations
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    Auto-correction and regeneration options
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <MindMapEditor
            initialData={mindMapData}
            onBack={() => setMindMapData(null)}
          />
        )}
      </div>
    </main>
  );
}
