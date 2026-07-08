import xml.etree.ElementTree as ET
import urllib.request
import urllib.error
import time
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def fetch_and_parse_feed():
    try:
        # Use a standard browser User-Agent
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        
        # Atom namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry_el in root.findall('atom:entry', ns):
            id_el = entry_el.find('atom:id', ns)
            title_el = entry_el.find('atom:title', ns)
            updated_el = entry_el.find('atom:updated', ns)
            content_el = entry_el.find('atom:content', ns)
            
            # Find the alternate link
            link = ""
            for link_el in entry_el.findall('atom:link', ns):
                if link_el.get('rel') == 'alternate' or not link_el.get('rel'):
                    link = link_el.get('href')
                    break
            
            entry = {
                'id': id_el.text if id_el is not None else '',
                'title': title_el.text if title_el is not None else '',
                'updated': updated_el.text if updated_el is not None else '',
                'link': link,
                'content': content_el.text if content_el is not None else ''
            }
            entries.append(entry)
            
        return entries, None
    except urllib.error.URLError as e:
        return None, f"Network error: {str(e.reason)}"
    except ET.ParseError as e:
        return None, f"XML parsing error: {str(e)}"
    except Exception as e:
        return None, f"An unexpected error occurred: {str(e)}"

def get_releases_data(force=False):
    now = time.time()
    if force or cache['data'] is None or (now - cache['last_updated']) > CACHE_DURATION:
        data, error = fetch_and_parse_feed()
        if not error:
            cache['data'] = data
            cache['last_updated'] = now
            return data, None
        else:
            # Fallback to cache if available on error
            if cache['data'] is not None:
                return cache['data'], None
            return None, error
    return cache['data'], None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    data, error = get_releases_data(force=force_refresh)
    if error:
        return jsonify({'error': error}), 500
    
    return jsonify({
        'releases': data,
        'cached': not force_refresh and (time.time() - cache['last_updated']) < CACHE_DURATION,
        'last_updated': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache['last_updated']))
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
