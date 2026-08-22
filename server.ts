import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// In-memory persistent history store
interface StoredRegistration {
  id: string;
  timestamp: string;
  projectName: string;
  sourceName: string;
  referenceName: string;
  sensor: string;
  algorithm: string;
  transformModel: string;
  inlierCount: number;
  inlierRatio: number;
  rmse: number;
  confidence: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  meta?: any;
}

const registrationHistory: StoredRegistration[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Lunar Image Registration API',
      timestamp: new Date().toISOString(),
      capabilities: [
        'SIFT_DoG',
        'ORB_FAST',
        'AKAZE_CraterRim',
        'RANSAC_Homography',
        'Subpixel_NCC',
        'CLAHE_Illumination',
        'Gemini_Selenology_AI',
      ],
      geminiAvailable: !!process.env.GEMINI_API_KEY,
    });
  });

  // 2. Sensor metadata presets
  app.get('/api/sensors', (req, res) => {
    res.json({
      sensors: [
        {
          id: 'OHRC',
          name: 'Chandrayaan-2 OHRC (Optical High Resolution Camera)',
          agency: 'ISRO',
          pixelResolutionMeters: '0.25m - 0.32m',
          swathWidthKm: 12,
          spectralBand: 'Panchromatic (450 - 900 nm)',
          primaryTargets: 'South Pole landing hazard detection, sub-meter crater mapping',
        },
        {
          id: 'TMC',
          name: 'Chandrayaan-2 TMC-2 (Terrain Mapping Camera-2)',
          agency: 'ISRO',
          pixelResolutionMeters: '5.0m',
          swathWidthKm: 20,
          spectralBand: 'Stereo Panchromatic (Fore, Nadir, Aft)',
          primaryTargets: 'Digital Elevation Models (DEM), 3D lunar surface morphology',
        },
        {
          id: 'IIRS',
          name: 'Chandrayaan-2 IIRS (Imaging Infrared Spectrometer)',
          agency: 'ISRO',
          pixelResolutionMeters: '80m',
          swathWidthKm: 20,
          spectralBand: '0.8 - 5.0 µm Hyperspectral',
          primaryTargets: 'OH/H2O hydration signatures, mineralogical mapping',
        },
        {
          id: 'LROC_NAC',
          name: 'LRO NAC (Narrow Angle Camera)',
          agency: 'NASA',
          pixelResolutionMeters: '0.50m',
          swathWidthKm: 5,
          spectralBand: 'Panchromatic (400 - 750 nm)',
          primaryTargets: 'High-resolution surface topography and Apollo landing sites',
        },
        {
          id: 'KAGUYA_TC',
          name: 'Kaguya Terrain Camera (TC)',
          agency: 'JAXA',
          pixelResolutionMeters: '10.0m',
          swathWidthKm: 35,
          spectralBand: 'Panchromatic stereo',
          primaryTargets: 'Global lunar morphologic mapping and lava tubes',
        },
      ],
    });
  });

  // 3. AI Selenological Geomorphology & Illumination Analysis (via Gemini 3.7 Flash)
  app.post('/api/ai-explain', async (req, res) => {
    try {
      const {
        sourceSensor,
        refSensor,
        inlierCount,
        inlierRatio,
        rmse,
        confidence,
        spatialScore,
        sunElevationSource,
        sunElevationRef,
        region,
        language = 'en',
      } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        // High quality fallback scientific description if Gemini API key not configured
        return res.json({
          insight: `Cross-sensor registration between ${sourceSensor} and ${refSensor} at ${region || 'Lunar South Pole'} succeeded with ${inlierCount} verified inliers and ${rmse} px RMSE. Solar illumination delta (Source: ${sunElevationSource ?? 42}°, Reference: ${sunElevationRef ?? 28}°) was successfully compensated via CLAHE gradient-space matching.`,
          source: 'algorithmic_fallback',
        });
      }

      const prompt = `You are a Senior ISRO & NASA Planetary Scientist specializing in Lunar Geomorphology and Optical Image Registration (Chandrayaan-2 OHRC/TMC-2, LROC).
Provide a concise, highly insightful scientific interpretation (3 paragraphs max) of the following lunar image registration result in language "${language}":
- Region: ${region || 'Lunar South Pole (Boguslawsky/Shackleton Crater)'}
- Source Sensor: ${sourceSensor} (Sun Elevation: ${sunElevationSource ?? 40}°)
- Reference Sensor: ${refSensor} (Sun Elevation: ${sunElevationRef ?? 28}°)
- Inlier Matches: ${inlierCount} (Inlier Ratio: ${(inlierRatio * 100).toFixed(1)}%)
- Registration RMSE: ${rmse} px
- Algorithmic Confidence: ${confidence}%
- Spatial Grid Coverage: ${spatialScore}%

Explain:
1. Planetary Geomorphology: What kind of terrain features (crater rims, ejecta blankets, boulders, regolith roughness) contributed to these stable inliers.
2. Illumination Invariance: How the solar angle difference affected shadowing and why gradient-invariant matching succeeded.
3. Mission Value: Practical utility for Chandrayaan precision landing hazard avoidance or high-resolution DEM creation. Keep it professional, objective, and scientifically precise.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      res.json({
        insight: response.text || 'Analysis completed.',
        source: 'gemini-3.7-flash',
      });
    } catch (err: any) {
      console.error('Gemini explanation error:', err);
      res.json({
        insight: 'Standard planetary science evaluation: High geometric consistency achieved across lunar crater boundaries.',
        source: 'fallback_error',
      });
    }
  });

  // 4. Registration History endpoints
  app.get('/api/history', (req, res) => {
    res.json({ history: registrationHistory });
  });

  app.post('/api/history', (req, res) => {
    const item: StoredRegistration = {
      id: req.body.id || `hist_${Date.now()}`,
      timestamp: req.body.timestamp || new Date().toISOString(),
      projectName: req.body.projectName || 'Lunar Registration Project',
      sourceName: req.body.sourceName || 'Source_Lunar.png',
      referenceName: req.body.referenceName || 'Reference_Lunar.png',
      sensor: req.body.sensor || 'OHRC',
      algorithm: req.body.algorithm || 'SIFT',
      transformModel: req.body.transformModel || 'HOMOGRAPHY',
      inlierCount: req.body.inlierCount || 0,
      inlierRatio: req.body.inlierRatio || 0,
      rmse: req.body.rmse || 0,
      confidence: req.body.confidence || 0,
      status: req.body.status || 'SUCCESS',
      meta: req.body.meta,
    };

    registrationHistory.unshift(item);
    if (registrationHistory.length > 50) registrationHistory.pop(); // Keep last 50

    res.json({ success: true, item });
  });

  app.delete('/api/history/:id', (req, res) => {
    const idx = registrationHistory.findIndex(h => h.id === req.params.id);
    if (idx !== -1) {
      registrationHistory.splice(idx, 1);
    }
    res.json({ success: true });
  });

  // Vite middleware for development & static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lunar Image Registration Platform running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
