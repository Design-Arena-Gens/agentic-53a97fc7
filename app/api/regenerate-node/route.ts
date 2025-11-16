import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

async function searchWeb(query: string) {
  try {
    const searchQuery = `${query} site:nih.gov OR site:cdc.gov OR site:who.int OR site:mayoclinic.org OR site:ncbi.nlm.nih.gov`;

    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        q: searchQuery,
        num: 3,
      },
    });

    return response.data.items?.slice(0, 3).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
    })) || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    const sources = await searchWeb(content);

    let prompt = `Improve and correct this medical concept: "${content}"`;

    if (sources.length > 0) {
      prompt += `\n\nReference information from reputable sources:\n`;
      sources.forEach((source: any, idx: number) => {
        prompt += `\n${idx + 1}. ${source.title}\n${source.snippet}\nSource: ${source.url}\n`;
      });
    }

    prompt += `\n\nProvide a corrected, accurate version of this concept in 2-5 words. Return ONLY the improved text, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    const improvedContent = textContent.text.trim();

    let verifyPrompt = `Verify the medical accuracy of this statement: "${improvedContent}"`;

    if (sources.length > 0) {
      verifyPrompt += `\n\nReference information:\n`;
      sources.forEach((source: any, idx: number) => {
        verifyPrompt += `\n${idx + 1}. ${source.snippet}\n`;
      });
    }

    verifyPrompt += `\n\nProvide a JSON response:
{
  "verified": true/false,
  "explanation": "brief explanation",
  "confidence": "high/medium/low"
}

Return ONLY valid JSON.`;

    const verifyMessage = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: verifyPrompt,
        },
      ],
    });

    const verifyText = verifyMessage.content.find((c) => c.type === 'text');
    let verification = { verified: true, explanation: '', confidence: 'medium' };

    if (verifyText && verifyText.type === 'text') {
      let responseText = verifyText.text.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.slice(7);
      } else if (responseText.startsWith('```')) {
        responseText = responseText.slice(3);
      }
      if (responseText.endsWith('```')) {
        responseText = responseText.slice(0, -3);
      }
      verification = JSON.parse(responseText.trim());
    }

    return NextResponse.json({
      content: improvedContent,
      verification: {
        ...verification,
        sources,
      },
    });
  } catch (error) {
    console.error('Error regenerating content:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate content' },
      { status: 500 }
    );
  }
}
