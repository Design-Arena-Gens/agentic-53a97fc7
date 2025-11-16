'use client';

import { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Search,
  FileDown,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MindMapEditorProps {
  initialData: {
    nodes: Node[];
    edges: Edge[];
    verifications: Record<string, any>;
  };
  onBack: () => void;
}

export default function MindMapEditor({
  initialData,
  onBack,
}: MindMapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
  const [verifications, setVerifications] = useState(initialData.verifications);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleEditNode = (nodeId: string, currentLabel: string) => {
    setEditingNode(nodeId);
    setEditText(currentLabel);
  };

  const handleSaveEdit = () => {
    if (editingNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === editingNode
            ? { ...node, data: { ...node.data, label: editText } }
            : node
        )
      );
      setEditingNode(null);
      setEditText('');
    }
  };

  const handleVerifyNode = async (nodeId: string) => {
    setVerifying(true);
    try {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const response = await fetch('/api/verify-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: node.data.label }),
      });

      const result = await response.json();
      setVerifications((prev) => ({
        ...prev,
        [nodeId]: result,
      }));

      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                className: result.verified ? 'verified' : 'unverified',
              }
            : n
        )
      );
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleRegenerateNode = async (nodeId: string) => {
    setVerifying(true);
    try {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const response = await fetch('/api/regenerate-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: node.data.label }),
      });

      const result = await response.json();

      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, label: result.content } }
            : n
        )
      );

      setVerifications((prev) => ({
        ...prev,
        [nodeId]: result.verification,
      }));
    } catch (err) {
      console.error('Regeneration error:', err);
    } finally {
      setVerifying(false);
    }
  };

  const exportToPDF = async () => {
    if (!reactFlowWrapper.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(reactFlowWrapper.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

      const citationsPage = Object.entries(verifications)
        .filter(([_, v]) => v?.sources?.length > 0)
        .map(([nodeId, v]) => {
          const node = nodes.find((n) => n.id === nodeId);
          return `${node?.data.label}:\n${v.sources
            .map((s: any) => `  - ${s.title}: ${s.url}`)
            .join('\n')}`;
        })
        .join('\n\n');

      if (citationsPage) {
        pdf.addPage();
        pdf.setFontSize(12);
        pdf.text('References and Citations', 20, 30);
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(citationsPage, pdf.internal.pageSize.width - 40);
        pdf.text(lines, 20, 50);
      }

      pdf.save('mindmap.pdf');
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const exportToJPEG = async () => {
    if (!reactFlowWrapper.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(reactFlowWrapper.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'mindmap.jpeg';
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/jpeg');
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 hover:bg-gray-700 px-3 py-2 rounded"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h2 className="text-xl font-semibold">Mind Map Editor</h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>PDF</span>
          </button>
          <button
            onClick={exportToJPEG}
            disabled={exporting}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>JPEG</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="w-80 bg-gray-50 p-4 border-l border-gray-200 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Node Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingNode === selectedNode.id ? (
              <div className="mb-4">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-2 border rounded mb-2"
                  rows={3}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 flex items-center justify-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditingNode(null)}
                    className="flex-1 bg-gray-300 px-3 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="bg-white p-3 rounded border mb-2">
                  {selectedNode.data.label}
                </div>
                <button
                  onClick={() =>
                    handleEditNode(selectedNode.id, selectedNode.data.label)
                  }
                  className="w-full flex items-center justify-center space-x-2 bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <button
                onClick={() => handleVerifyNode(selectedNode.id)}
                disabled={verifying}
                className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>Verify Accuracy</span>
              </button>
              <button
                onClick={() => handleRegenerateNode(selectedNode.id)}
                disabled={verifying}
                className="w-full flex items-center justify-center space-x-2 bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Regenerate</span>
              </button>
            </div>

            {verifications[selectedNode.id] && (
              <div className="bg-white p-4 rounded border">
                <div className="flex items-center space-x-2 mb-3">
                  {verifications[selectedNode.id].verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold">
                    {verifications[selectedNode.id].verified
                      ? 'Verified'
                      : 'Needs Review'}
                  </span>
                </div>

                {verifications[selectedNode.id].explanation && (
                  <p className="text-sm text-gray-700 mb-3">
                    {verifications[selectedNode.id].explanation}
                  </p>
                )}

                {verifications[selectedNode.id].sources?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Sources:</h4>
                    <ul className="space-y-2">
                      {verifications[selectedNode.id].sources.map(
                        (source: any, idx: number) => (
                          <li key={idx} className="text-xs">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {source.title}
                            </a>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
