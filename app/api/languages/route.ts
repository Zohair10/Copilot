import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("GitHubCopilotData");
    const collection = db.collection("GetMetricsData");

    // Get query parameters for language filtering
    const { searchParams } = new URL(request.url);
    const selectedLanguages = searchParams.getAll('languages');

    const data = await collection.find({}, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();

    if (data.length === 0) {
      return NextResponse.json({ error: 'No data found' });
    }

    // Helper function to normalize language names
    const normalizeLanguageName = (language: string): string => {
      const normalizedName = language.toLowerCase().trim();
      
      // Normalize common language names (case-insensitive with common variants)
      if (normalizedName === 'javascript') return 'JavaScript';
      else if (normalizedName === 'typescript') return 'TypeScript';
      else if (normalizedName === 'python') return 'Python';
      else if (normalizedName === 'java') return 'Java';
      else if (normalizedName === 'csharp' || normalizedName === 'c#') return 'C#';
      else if (normalizedName === 'html') return 'HTML';
      else if (normalizedName === 'css') return 'CSS';
      else if (normalizedName === 'json') return 'JSON';
      else if (normalizedName === 'sql') return 'SQL';
      else if (normalizedName === 'go') return 'Go';
      else if (normalizedName === 'rust') return 'Rust';
      else if (normalizedName === 'php') return 'PHP';
      else if (normalizedName === 'ruby') return 'Ruby';
      else if (normalizedName === 'dart') return 'Dart';
      else if (normalizedName === 'kotlin') return 'Kotlin';
      else if (normalizedName === 'swift') return 'Swift';
      else if (normalizedName === 'yaml' || normalizedName === 'yml') return 'YAML';
      else if (normalizedName === 'xml') return 'XML';
      else if (normalizedName === 'markdown' || normalizedName === 'md') return 'Markdown';
      // Additional React/JSX variants
      else if (normalizedName === 'javascriptreact' || normalizedName === 'jsx') return 'JavaScript React';
      else if (normalizedName === 'typescriptreact' || normalizedName === 'tsx') return 'TypeScript React';
      // Environment and config files
      else if (normalizedName === 'dotenv' || normalizedName === '.env') return 'Environment Files';
      else if (normalizedName === 'dockerfile' || normalizedName === 'docker') return 'Dockerfile';
      // Other common language variants
      else if (normalizedName === 'cplusplus' || normalizedName === 'c++' || normalizedName === 'cpp') return 'C++';
      else if (normalizedName === 'c' && language.length === 1) return 'C';
      else if (normalizedName === 'shell' || normalizedName === 'bash' || normalizedName === 'sh') return 'Shell';
      else if (normalizedName === 'powershell' || normalizedName === 'ps1') return 'PowerShell';
      else if (normalizedName === 'r') return 'R';
      else if (normalizedName === 'vue' || normalizedName === 'vuejs') return 'Vue.js';
      else if (normalizedName === 'scss' || normalizedName === 'sass') return 'Sass/SCSS';
      else if (normalizedName === 'less') return 'Less';
      else {
        // For any unmatched language, use proper title case for the first letter
        return language.charAt(0).toUpperCase() + language.slice(1);
      }
    };

    // Process language data
    const allLanguages = new Set<string>();
    const languageAggregation: { [key: string]: any } = {};

    data.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      
      // Extract languages from copilot_ide_code_completions
      if (item.copilot_ide_code_completions?.languages) {
        item.copilot_ide_code_completions.languages.forEach((langItem: any) => {
          if (langItem.name) {
            const normalizedLanguageName = normalizeLanguageName(langItem.name);
            allLanguages.add(normalizedLanguageName);
            
            // Filter by selected languages if specified (using normalized names)
            if (selectedLanguages.length === 0 || selectedLanguages.includes(normalizedLanguageName)) {
              // Calculate total suggestions and acceptances across all editors for this language
              let totalSuggestions = 0;
              let totalAcceptances = 0;
              
              if (item.copilot_ide_code_completions?.editors) {
                item.copilot_ide_code_completions.editors.forEach((editor: any) => {
                  if (editor.models) {
                    editor.models.forEach((model: any) => {
                      if (model.languages) {
                        const editorLang = model.languages.find((l: any) => l.name === langItem.name);
                        if (editorLang) {
                          totalSuggestions += editorLang.total_code_suggestions || 0;
                          totalAcceptances += editorLang.total_code_acceptances || 0;
                        }
                      }
                    });
                  }
                });
              }

              // Create aggregation key for this language and date
              const aggregationKey = `${date}-${normalizedLanguageName}`;
              
              if (!languageAggregation[aggregationKey]) {
                languageAggregation[aggregationKey] = {
                  date,
                  language: normalizedLanguageName,
                  total_engaged_users: 0,
                  total_code_acceptances: 0,
                  total_code_suggestions: 0
                };
              }
              
              // Aggregate the data for normalized language names
              languageAggregation[aggregationKey].total_engaged_users += langItem.total_engaged_users || 0;
              languageAggregation[aggregationKey].total_code_acceptances += totalAcceptances;
              languageAggregation[aggregationKey].total_code_suggestions += totalSuggestions;
            }
          }
        });
      }
    });

    // Convert aggregated data to array
    const languagesData = Object.values(languageAggregation);

    // Create weekly aggregation
    const weeklyLanguages: { [key: string]: any } = {};
    languagesData.forEach(item => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}-${item.language}`;
      
      if (!weeklyLanguages[weekKey]) {
        weeklyLanguages[weekKey] = {
          week: getStartOfWeek(date).toISOString().split('T')[0],
          language: item.language,
          total_engaged_users: 0,
          total_code_acceptances: 0,
          total_code_suggestions: 0
        };
      }
      
      weeklyLanguages[weekKey].total_engaged_users += item.total_engaged_users;
      weeklyLanguages[weekKey].total_code_acceptances += item.total_code_acceptances;
      weeklyLanguages[weekKey].total_code_suggestions += item.total_code_suggestions;
    });

    // Get top languages
    const languageTotals: { [key: string]: number } = {};
    languagesData.forEach(item => {
      if (!languageTotals[item.language]) {
        languageTotals[item.language] = 0;
      }
      languageTotals[item.language] += item.total_engaged_users;
    });

    // Sort and get top languages with "Others" category
    const sortedLanguages = Object.entries(languageTotals)
      .sort(([,a], [,b]) => b - a);
    
    const topLanguagesData: { [key: string]: number } = {};
    const minUsers = 10;
    let othersTotal = 0;

    sortedLanguages.forEach(([lang, count]) => {
      if (count >= minUsers) {
        topLanguagesData[lang] = count;
      } else {
        othersTotal += count;
      }
    });

    if (othersTotal > 0) {
      topLanguagesData['Others'] = othersTotal;
    }

    const charts = {
      "languages_daily": {
        "data": languagesData,
        "title": "Code Acceptances & Suggestions per Language (Daily)"
      },
      "languages_weekly": {
        "data": Object.values(weeklyLanguages),
        "title": "Code Acceptances & Suggestions per Language (Last 7 Days)"
      },
      "top_languages": {
        "data": topLanguagesData,
        "title": "Top Programming Languages by Engaged Users"
      },
      "available_languages": Array.from(allLanguages).sort()
    };

    return NextResponse.json(charts);
  } catch (error) {
    console.error('Error fetching languages data:', error);
    return NextResponse.json({ error: 'Failed to fetch languages data' }, { status: 500 });
  }
}

function getWeekNumber(date: Date): number {
  const startDate = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil(days / 7);
}

function getStartOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}
