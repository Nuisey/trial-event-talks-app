# BigQuery Release Pulse 🚀

A modern, highly polished web application that parses, tracks, filters, and shares Google Cloud BigQuery Release Notes in real time. 

Built using a Python Flask backend paired with a premium, responsive front-end utilizing vanilla HTML, JavaScript, and CSS (featuring a dark mode layout, glassmorphic styling, and fluid animations).

---

## ✨ Features

- **Asynchronous Feed Polling & Caching**: Pulls the official Google Cloud BigQuery XML feed. Implements an in-memory caching layer to optimize load times and prevent feed rate-limiting.
- **Granular Update Cards**: Instead of showing a whole day's release notes in a single card, a client-side parser splits updates by category headings (e.g. separating a "Feature" and a "Change" on the same day into separate cards).
- **Fuzzy Search & Filters**: Instantly query dates, types, or descriptions, and narrow search results using category filter chips.
- **X / Twitter Draft Composer**: Automatically builds custom tweet previews with category emojis, date tags, text summaries, and direct source links. Prevents exceeding the 280-character limit and redirects to X's Web Intent composer.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.13+, Flask
- **Frontend**: Vanilla HTML5, CSS3, Modern JavaScript (ES6)
- **APIs & Feeds**: Google Cloud BigQuery Release Notes RSS/Atom Feed, X (Twitter) Web Intent API
- **Design System**: Glassmorphism, CSS Custom Properties, Responsive Layouts

---

## 📁 Project Structure

```text
├── app.py                # Flask Server: RSS Fetching, Cache, & API routing
├── templates/
│   └── index.html        # Front-End Structure & Composer Modals
├── static/
│   ├── css/
│   │   └── style.css     # Dark mode, Glassmorphism, animations & color tags
│   └── js/
│       └── app.js        # DOMParser content splitting, filtering & tweet drafts
├── .gitignore            # Git exclusion rules
└── README.md             # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Python 3 installed. You can check your version by running:
```powershell
python --version
```

### 2. Installation
Clone the repository and install Flask (if not already installed on your system):
```powershell
pip install flask
```

### 3. Running the App
Start the Flask development server:
```powershell
python app.py
```

Open your browser and navigate to:
*   [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🔧 How It Works

### Feed Extraction
The backend ([app.py](app.py)) queries Google's Atom Feed using python's built-in `xml.etree.ElementTree`. It formats the data into structured JSON, which is exposed to the frontend via the `/api/releases` API.

### Content Splitting
Google's release feed groups all releases for a single day into one `<content>` tag. To make updates shareable and searchable, the frontend ([static/js/app.js](static/js/app.js)) uses the browser's `DOMParser` to parse the HTML string. It loops through the nodes and splits them on each `<h3>` heading, creating isolated cards for each feature, change, or deprecation.

### Twitter Integration
When you click **Draft Tweet** on any card, the script:
1. Strips HTML tags to extract clean plain text.
2. Prefixes the text with a category emoji (🚀 for Features, ⚙️ for Changes, ⚠️ for Deprecations).
3. Formats it alongside the release date and the official Google documentation link.
4. Truncates the summary text to fit within X's 280-character limit.
5. Populates the editor modal and opens the web intent composer when clicked.
