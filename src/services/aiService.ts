import { RegistrationResult, SupportedLanguage } from '../types';

export async function fetchAIInsights(
  result: RegistrationResult,
  language: SupportedLanguage = 'en'
): Promise<string> {
  try {
    const res = await fetch('/api/ai-explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceSensor: result.sourceMeta.sensor,
        refSensor: result.referenceMeta.sensor,
        inlierCount: result.metrics.inlierCount,
        inlierRatio: result.metrics.inlierRatio,
        rmse: result.metrics.rmse,
        confidence: result.metrics.confidenceScore,
        spatialScore: result.metrics.spatialDistributionScore,
        sunElevationSource: result.sourceMeta.sunElevationDeg,
        sunElevationRef: result.referenceMeta.sunElevationDeg,
        region: result.referenceMeta.targetRegion,
        language,
      }),
    });

    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    return data.insight || 'Analysis completed.';
  } catch (err) {
    console.warn('AI Insights fallback:', err);
    return `Cross-sensor registration between ${result.sourceMeta.sensor} and ${result.referenceMeta.sensor} completed with ${result.metrics.inlierCount} inliers (RMSE: ${result.metrics.rmse} px). Solar shadow differences were normalized using multi-scale gradient descriptors.`;
  }
}

export async function saveRegistrationToHistory(result: RegistrationResult, projectName: string = 'Lunar Registration'): Promise<void> {
  try {
    // 1. Save to local storage for instant offline access
    const existing = JSON.parse(localStorage.getItem('lunar_registration_history') || '[]');
    const item = {
      id: result.id,
      timestamp: result.timestamp,
      projectName,
      sourceName: result.sourceMeta.name,
      referenceName: result.referenceMeta.name,
      sensor: result.sourceMeta.sensor,
      algorithm: result.featureMethod,
      transformModel: result.transformModel,
      inlierCount: result.metrics.inlierCount,
      inlierRatio: result.metrics.inlierRatio,
      rmse: result.metrics.rmse,
      confidence: result.metrics.confidenceScore,
      status: result.metrics.rmse < 2.5 ? 'SUCCESS' : 'WARNING',
      result,
    };
    existing.unshift(item);
    localStorage.setItem('lunar_registration_history', JSON.stringify(existing.slice(0, 30)));

    // 2. Also persist to backend API
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (e) {
    console.warn('Could not save history to server:', e);
  }
}

export function getLocalHistory(): any[] {
  try {
    return JSON.parse(localStorage.getItem('lunar_registration_history') || '[]');
  } catch {
    return [];
  }
}
