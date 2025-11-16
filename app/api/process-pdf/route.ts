import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze this document text and extract key concepts to create a mind map structure.

Document content:
${text.slice(0, 10000)}

Return a JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "1",
      "type": "default",
      "position": { "x": 0, "y": 0 },
      "data": { "label": "Main Topic" }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "type": "smoothstep"
    }
  ]
}

Guidelines:
1. Create a central node for the main topic
2. Create child nodes for major concepts (positioned around the center)
3. Create connections showing relationships
4. Use clear, concise labels (2-5 words)
5. Position nodes in a radial layout around the center
6. Space nodes 200-300 pixels apart
7. Include 8-15 key concepts total

Return ONLY valid JSON, no other text.`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    let responseText = textContent.text.trim();

    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7);
    } else if (responseText.startsWith('```')) {
      responseText = responseText.slice(3);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.slice(0, -3);
    }
    responseText = responseText.trim();

    const mindMapData = JSON.parse(responseText);

    return NextResponse.json({
      nodes: mindMapData.nodes,
      edges: mindMapData.edges,
      verifications: {},
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}
