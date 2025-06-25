from flask import Flask, jsonify, render_template, request
from pymongo import MongoClient
from collections import defaultdict
import pandas as pd
from datetime import datetime, timedelta

app = Flask(__name__)
client = MongoClient("mongodb://localhost:27017/")
db = client["GitHubCopilotData"]
collection = db["GetMetricsData"]

def get_processed_data(query=None):
    """Get and process data from MongoDB"""
    if query is None:
        query = {}
    data = list(collection.find(query, {'_id': 0}))
    df = pd.DataFrame(data)
    if not df.empty:
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
    return df

def get_date_filter():
    days = request.args.get('days', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    date_filter = {}
    if days:
        date_filter['$gte'] = datetime.now() - timedelta(days=days)
    elif start_date and end_date:
        date_filter['$gte'] = datetime.strptime(start_date, '%Y-%m-%d')
        date_filter['$lte'] = datetime.strptime(end_date, '%Y-%m-%d')
    return date_filter

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/organization')
def get_organization():
    date_filter = get_date_filter()
    query = {}
    if date_filter:
        query['date'] = date_filter
    df = get_processed_data(query)
    if df.empty:
        return jsonify({"error": "No data available"})
    
    # Fix the weekly data serialization issue
    df_weekly = df.copy()
    df_weekly['week'] = df_weekly['date'].dt.to_period('W').dt.start_time
    weekly_data = df_weekly.groupby('week').agg({
        'total_active_users': 'sum',
        'total_engaged_users': 'sum'
    }).reset_index()
    weekly_data['week'] = weekly_data['week'].dt.strftime('%Y-%m-%d')
    
    # Fix daily data serialization
    daily_data = df[['date', 'total_active_users', 'total_engaged_users']].copy()
    daily_data['date'] = daily_data['date'].dt.strftime('%Y-%m-%d')
    
    charts = {
        "active_vs_engaged_daily": {
            "data": daily_data.to_dict('records'),
            "title": "Active vs Engaged Users (Daily)"
        },
        "active_vs_engaged_weekly": {
            "data": weekly_data.to_dict('records'),
            "title": "Active vs Engaged Users (Weekly)"
        },
        "features_daily": {
            "data": prepare_features_data(df),
            "title": "Engaged Users per Feature (Daily)"
        },
        "features_weekly": {
            "data": prepare_features_data_weekly(df),
            "title": "Engaged Users per Feature (Weekly)"
        }
    }
    return jsonify(charts)

@app.route('/api/languages')
def get_languages():
    """Return language-specific charts data"""
    df = get_processed_data()
    if df.empty:
        return jsonify({"error": "No data available"})
    
    # Get filter parameters
    selected_languages = request.args.getlist('languages')
    
    # Process language data
    languages_data = []
    for _, row in df.iterrows():
        date = row['date']
        if 'copilot_ide_code_completions' in row and row['copilot_ide_code_completions']:
            for editor in row['copilot_ide_code_completions'].get('editors', []):
                for model in editor.get('models', []):
                    for lang in model.get('languages', []):
                        languages_data.append({
                            'date': date.strftime('%Y-%m-%d'),
                            'language': str(lang.get('name', '')),
                            'total_engaged_users': int(lang.get('total_engaged_users', 0)),
                            'total_code_acceptances': int(lang.get('total_code_acceptances', 0)),
                            'total_code_suggestions': int(lang.get('total_code_suggestions', 0))
                        })
    
    # Keep original data for pie chart (unfiltered)
    original_languages_data = languages_data.copy()
    
    # Filter by selected languages if specified (only for line charts)
    if selected_languages:
        languages_data = [item for item in languages_data if item['language'] in selected_languages]
    
    # Create weekly aggregation
    weekly_languages = []
    if languages_data:
        languages_df = pd.DataFrame(languages_data)
        languages_df['date'] = pd.to_datetime(languages_df['date'])
        languages_df['week'] = languages_df['date'].dt.to_period('W').dt.start_time
        weekly_languages_df = languages_df.groupby(['language', 'week']).agg({
            'total_engaged_users': 'sum',
            'total_code_acceptances': 'sum',
            'total_code_suggestions': 'sum'
        }).reset_index()
        weekly_languages_df['week'] = weekly_languages_df['week'].dt.strftime('%Y-%m-%d')
        
        # Convert to list of dicts with proper type conversion
        weekly_languages = []
        for _, row in weekly_languages_df.iterrows():
            weekly_languages.append({
                'language': str(row['language']),
                'week': str(row['week']),
                'total_engaged_users': int(row['total_engaged_users']),
                'total_code_acceptances': int(row['total_code_acceptances']),
                'total_code_suggestions': int(row['total_code_suggestions'])
            })
    
    # Get available languages for filtering
    all_languages = list(set(item['language'] for item in languages_data if item['language']))
    all_languages.sort()
    
    charts = {
        "languages_daily": {
            "data": languages_data,
            "title": "Code Acceptances & Suggestions per Language (Daily)"
        },
        "languages_weekly": {
            "data": weekly_languages,
            "title": "Code Acceptances & Suggestions per Language (Weekly)"
        },
        "top_languages": {
            "data": get_top_languages_with_others(original_languages_data),
            "title": "Top Programming Languages by Engaged Users"
        },
        "available_languages": all_languages
    }
    return jsonify(charts)

@app.route('/api/editors')
def get_editors():
    """Return editor-specific charts data"""
    df = get_processed_data()
    if df.empty:
        return jsonify({"error": "No data available"})
    
    # Get filter parameters
    selected_editors = request.args.getlist('editors')
    
    # Process editor data
    editors_data = []
    chats_data = []
    copy_insert_data = []
    
    for _, row in df.iterrows():
        date = row['date']
        if 'copilot_ide_chat' in row and row['copilot_ide_chat']:
            for editor in row['copilot_ide_chat'].get('editors', []):
                editor_name = editor.get('name')
                
                editors_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'editor': str(editor_name),
                    'total_engaged_users': int(editor.get('total_engaged_users', 0))
                })
                
                # Chat data
                total_chats = sum(model.get('total_chats', 0) for model in editor.get('models', []))
                chats_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'editor': str(editor_name),
                    'total_chats': int(total_chats)
                })
                
                # Copy and insertion events data
                total_copy_events = sum(model.get('total_chat_copy_events', 0) for model in editor.get('models', []))
                total_insertion_events = sum(model.get('total_chat_insertion_events', 0) for model in editor.get('models', []))
                copy_insert_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'editor': str(editor_name),
                    'total_chat_copy_events': int(total_copy_events),
                    'total_chat_insertion_events': int(total_insertion_events)
                })
    
    # Keep original data for pie chart (unfiltered)
    original_editors_data = editors_data.copy()
    original_chats_data = chats_data.copy()
    original_copy_insert_data = copy_insert_data.copy()
    
    # Filter data for line charts if filters are specified
    if selected_editors:
        editors_data = [item for item in editors_data if item['editor'] in selected_editors]
        chats_data = [item for item in chats_data if item['editor'] in selected_editors]
        copy_insert_data = [item for item in copy_insert_data if item['editor'] in selected_editors]
        
    # Create weekly aggregations
    editors_df = pd.DataFrame(editors_data)
    chats_df = pd.DataFrame(chats_data)
    copy_insert_df = pd.DataFrame(copy_insert_data)
    
    weekly_editors = []
    weekly_chats = []
    weekly_copy_insert = []
    
    if not editors_df.empty:
        editors_df['date'] = pd.to_datetime(editors_df['date'])
        editors_df['week'] = editors_df['date'].dt.to_period('W').dt.start_time
        weekly_editors_df = editors_df.groupby(['editor', 'week']).agg({
            'total_engaged_users': 'sum'
        }).reset_index()
        weekly_editors_df['week'] = weekly_editors_df['week'].dt.strftime('%Y-%m-%d')
        
        # Convert to list of dicts with proper type conversion
        weekly_editors = []
        for _, row in weekly_editors_df.iterrows():
            weekly_editors.append({
                'editor': str(row['editor']),
                'week': str(row['week']),
                'total_engaged_users': int(row['total_engaged_users'])
            })
    
    if not chats_df.empty:
        chats_df['date'] = pd.to_datetime(chats_df['date'])
        chats_df['week'] = chats_df['date'].dt.to_period('W').dt.start_time
        weekly_chats_df = chats_df.groupby(['editor', 'week']).agg({
            'total_chats': 'sum'
        }).reset_index()
        weekly_chats_df['week'] = weekly_chats_df['week'].dt.strftime('%Y-%m-%d')
        
        # Convert to list of dicts with proper type conversion
        weekly_chats = []
        for _, row in weekly_chats_df.iterrows():
            weekly_chats.append({
                'editor': str(row['editor']),
                'week': str(row['week']),
                'total_chats': int(row['total_chats'])
            })
    
    if not copy_insert_df.empty:
        copy_insert_df['date'] = pd.to_datetime(copy_insert_df['date'])
        copy_insert_df['week'] = copy_insert_df['date'].dt.to_period('W').dt.start_time
        weekly_copy_insert_df = copy_insert_df.groupby(['editor', 'week']).agg({
            'total_chat_copy_events': 'sum',
            'total_chat_insertion_events': 'sum'
        }).reset_index()
        weekly_copy_insert_df['week'] = weekly_copy_insert_df['week'].dt.strftime('%Y-%m-%d')
        
        # Convert to list of dicts with proper type conversion
        weekly_copy_insert = []
        for _, row in weekly_copy_insert_df.iterrows():
            weekly_copy_insert.append({
                'editor': str(row['editor']),
                'week': str(row['week']),
                'total_chat_copy_events': int(row['total_chat_copy_events']),
                'total_chat_insertion_events': int(row['total_chat_insertion_events'])
            })
    
    # Get available editors for filtering
    all_editors = list(set(item['editor'] for item in editors_data if item['editor']))
    all_editors.sort()
    
    charts = {
        "editors_daily": {
            "data": editors_data,
            "title": "Engaged Users per Editor (Daily)"
        },
        "editors_weekly": {
            "data": weekly_editors,
            "title": "Engaged Users per Editor (Weekly)"
        },
        "chats_daily": {
            "data": chats_data,
            "title": "Total Chats per Editor (Daily)"
        },
        "chats_weekly": {
            "data": weekly_chats,
            "title": "Total Chats per Editor (Weekly)"
        },
        "copy_insert_daily": {
            "data": copy_insert_data,
            "title": "Chat Copy & Insertion Events per Editor (Daily)"
        },
        "copy_insert_weekly": {
            "data": weekly_copy_insert,
            "title": "Chat Copy & Insertion Events per Editor (Weekly)"
        },
        "top_editors": {
            "data": get_top_editors(original_editors_data),
            "title": "Top Editors by Engaged Users"
        },
        "available_editors": all_editors
    }
    return jsonify(charts)

@app.route('/api/billing')
def get_billing_daily():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["GitHubCopilotData"]
    collection = db["BillingSeats"]

    # Aggregate: count per day per plan_type
    pipeline = [
        {
            "$group": {
                "_id": {
                    "date": {"$substr": ["$created_at", 0, 10]},  # YYYY-MM-DD
                    "plan_type": "$plan_type"
                },
                "count": {"$sum": 1}
            }
        },
        {
            "$sort": {"_id.date": 1}
        }
    ]
    results = list(collection.aggregate(pipeline))

    # Transform for frontend
    data = defaultdict(dict)
    plan_types = set()
    for row in results:
        date = row['_id']['date']
        plan_type = row['_id']['plan_type']
        count = row['count']
        data[date][plan_type] = count
        plan_types.add(plan_type)

    # Prepare data for chart.js
    chart_data = []
    for date in sorted(data.keys()):
        entry = {"date": date}
        for pt in plan_types:
            entry[pt] = data[date].get(pt, 0)
        chart_data.append(entry)

    # --- Add this to fetch all seats ---
    seats = list(collection.find({}, {
        "_id": 0,
        "assignee.login": 1,
        "created_at": 1,
        "plan_type": 1,
        "last_activity_at": 1,
        "last_activity_editor": 1
    }))


    return jsonify({
        "title": "Daily Billing Plans Purchased by Plan Type",
        "data": chart_data,
        "plan_types": sorted(plan_types),
        "seats": seats
    })

def prepare_features_data(df):
    """Prepare features data for charts"""
    features_data = []
    for _, row in df.iterrows():
        date = row['date']
        
        # IDE Chat
        ide_chat_engaged = 0
        if 'copilot_ide_chat' in row and row['copilot_ide_chat']:
            ide_chat_engaged = sum(editor.get('total_engaged_users', 0) 
                                 for editor in row['copilot_ide_chat'].get('editors', []))
        
        # Dotcom Chat
        dotcom_chat_engaged = 0
        if 'copilot_dotcom_chat' in row and row['copilot_dotcom_chat']:
            dotcom_chat_engaged = row['copilot_dotcom_chat'].get('total_engaged_users', 0)
        
        # Pull Requests
        pull_request_engaged = 0
        if 'copilot_dotcom_pull_requests' in row and row['copilot_dotcom_pull_requests']:
            pull_request_engaged = row['copilot_dotcom_pull_requests'].get('total_engaged_users', 0)
        
        # Code Completion
        code_completion_engaged = 0
        if 'copilot_ide_code_completions' in row and row['copilot_ide_code_completions']:
            for editor in row['copilot_ide_code_completions'].get('editors', []):
                for model in editor.get('models', []):
                    for lang in model.get('languages', []):
                        code_completion_engaged += lang.get('total_engaged_users', 0)
        
        features_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'IDE_Chat': ide_chat_engaged,
            'Dotcom_Chat': dotcom_chat_engaged,
            'Pull_Request': pull_request_engaged,
            'Code_Completion': code_completion_engaged
        })
    
    return features_data

def prepare_features_data_weekly(df):
    """Prepare weekly features data for charts"""
    # First get daily data
    daily_features = prepare_features_data(df)
    
    if not daily_features:
        return []
    
    # Convert to DataFrame for aggregation
    features_df = pd.DataFrame(daily_features)
    features_df['date'] = pd.to_datetime(features_df['date'])
    features_df['week'] = features_df['date'].dt.to_period('W').dt.start_time
    
    # Aggregate by week
    weekly_features_df = features_df.groupby('week').agg({
        'IDE_Chat': 'sum',
        'Dotcom_Chat': 'sum',
        'Pull_Request': 'sum',
        'Code_Completion': 'sum'
    }).reset_index()
    
    # Convert week back to string
    weekly_features_df['week'] = weekly_features_df['week'].dt.strftime('%Y-%m-%d')
    
    return weekly_features_df.to_dict('records')

def get_top_languages(languages_data):
    """Get top languages by total engaged users"""
    df = pd.DataFrame(languages_data)
    if df.empty:
        return {}
    result = df.groupby('language')['total_engaged_users'].sum().sort_values(ascending=False)
    # Convert to native Python types for JSON serialization
    return {str(lang): int(count) for lang, count in result.items()}

def get_top_languages_with_others(languages_data, min_users=10):
    """Get top languages by total engaged users, grouping small languages as 'Others'"""
    df = pd.DataFrame(languages_data)
    if df.empty:
        return {}
    
    # Group by language and sum engaged users
    lang_totals = df.groupby('language')['total_engaged_users'].sum().sort_values(ascending=False)
    
    # Separate languages with >= min_users from those with < min_users
    main_languages = lang_totals[lang_totals >= min_users]
    small_languages = lang_totals[lang_totals < min_users]
    
    # Create result dictionary with explicit type conversion
    result = {}
    for lang, count in main_languages.items():
        result[str(lang)] = int(count)  # Convert to native Python types
    
    # Add 'Others' category if there are small languages
    if not small_languages.empty:
        result['Others'] = int(small_languages.sum())
    
    return result

def get_top_editors(editors_data):
    """Get top editors by total engaged users"""
    df = pd.DataFrame(editors_data)
    if df.empty:
        return {}
    result = df.groupby('editor')['total_engaged_users'].sum().sort_values(ascending=False)
    # Convert to native Python types for JSON serialization
    return {str(editor): int(count) for editor, count in result.items()}

if __name__ == '__main__':
    app.run(debug=True)