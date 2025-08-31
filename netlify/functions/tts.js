// netlify/functions/tts.js
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { text, voice = 'ja-JP-Wavenet-B', speed = 1.0 } = JSON.parse(event.body);

    // Validate input
    if (!text || typeof text !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required and must be a string' }),
      };
    }

    if (text.length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text too long (max 100 characters)' }),
      };
    }

    // Rate limiting (simple implementation)
    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    // In production, you'd want to implement proper rate limiting with a database

    // Initialize Google Cloud TTS client
    const client = new TextToSpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    });

    // Construct the request
    const request = {
      input: { text: text },
      voice: {
        languageCode: 'ja-JP',
        name: voice,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speed,
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    };

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);

    // Return the audio content as base64
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: response.audioContent.toString('base64'),
        contentType: 'audio/mpeg',
        cacheKey: `${text}-${voice}-${speed}`,
      }),
    };

  } catch (error) {
    console.error('TTS Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Text-to-speech service unavailable',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};
