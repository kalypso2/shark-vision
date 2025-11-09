# 🎥 Shark Vision - AI Presentation Analyzer# 🎯 Presentation Analysis Bot



A real-time presentation analysis tool powered by Google Gemini AI that provides timestamped feedback and comprehensive reporting.An AI-powered presentation analyzer that uses Google's Gemini API to evaluate slide effectiveness and provide actionable feedback to improve your presentations.



## ✨ Features## ✨ NEW: Live Recording Mode!



- **📹 Real-time Analysis** - Captures and analyzes presentation frames every 3 secondsNow includes **real-time recording and analysis** of your presentations as you deliver them!

- **🤖 AI-Powered Feedback** - Uses Google Gemini 2.0 Flash for intelligent evaluation

- **⏰ Timestamped Issues** - Precisely timestamps when problems are detected## 🎥 Two Modes Available

- **📊 Comprehensive Reports** - Generates detailed on-screen reports with actionable suggestions

- **🎯 Multiple Evaluation Categories**:### 1. Upload Mode (Static Analysis)

  - Text Clarity (readability, font size, 6x6 rule compliance)- Upload images or PDFs of your slides

  - Visual Design (color contrast, hierarchy, aesthetics)- Get detailed analysis of each slide

  - Content Quality (message clarity, audience appropriateness)- Perfect for pre-presentation review

  - Overall Impact (persuasiveness, professionalism)

### 2. Live Recording Mode (Real-Time Analysis) 🆕

## 🚀 Quick Start- **Record your screen** while presenting

- **Capture frames automatically** every 2 seconds

1. **Clone and setup:**- **Real-time AI analysis** during your presentation

   ```bash- **See live feedback** as you present

   git clone https://github.com/kalypso2/shark-vision.git- **Session tracking** with timestamped analyses

   cd shark-vision- Choose between **screen share** or **webcam**

   python -m venv .venv

   source .venv/bin/activate  # On Windows: .venv\Scripts\activate## ✨ Features

   pip install -r requirements.txt

   ```- **Comprehensive Slide Analysis**: Evaluates 5 key aspects of each slide:

  - Text Clarity & Readability

2. **Configure Gemini API:**  - Visual Design & Color Psychology

   ```bash  - Image/Graphics Effectiveness

   # Create .env file  - Message Clarity & Content Flow

   echo "GEMINI_API_KEY=your_api_key_here" > .env  - Overall Impact & Engagement

   ```

- **AI-Powered Feedback**: Uses Gemini 2.0 to provide:

3. **Run the application:**  - Numerical scores (0-10) for each aspect

   ```bash  - Detailed analysis and reasoning

   python app_new.py  - Specific improvement suggestions

   ```  - Strengths and weaknesses identification

  - Top 3 actionable recommendations

4. **Open in browser:** http://localhost:5000/recorder

- **Multi-Format Support**: 

## 🎯 How to Use  - Single slide images (JPG, PNG, GIF)

  - PDF presentations (analyzes each page)

1. **Start Analysis** - Click "🔴 Start Recording" to begin frame capture  - PowerPoint files (PPTX) - coming soon

2. **Present Your Content** - Show slides or presentation board to webcam

3. **Monitor Real-time Issues** - Watch timestamped problems appear on the right panel- **Beautiful Interface**:

4. **Stop Analysis** - Click "⏹️ Stop Recording" when finished  - Drag-and-drop upload

5. **Generate Report** - Click "📊 Generate Report" for comprehensive analysis  - Real-time analysis progress

  - Visual score cards with progress bars

## 📋 Sample Report Output  - Color-coded feedback (strengths, weaknesses, improvements)



```## 🚀 Quick Start

📊 Presentation Analysis Summary

"Good presentation with some minor improvements needed."### 1. Install Dependencies



Duration: 2:15  |  Frames: 45  |  Issues: 3  |  Avg Score: 7.2/10```bash

# Create virtual environment

🚨 Issues Detected (3 total)python3 -m venv .venv

🔴 Critical: 0  🟠 High: 1  🔵 Medium: 2  🟢 Low: 0source .venv/bin/activate



⏱️ 00:23 | Text Clarity | HIGH# Install packages

"Font size appears too small for audience visibility"pip install -r requirements.txt

💡 Increase font to minimum 24pt for body text```



⏱️ 01:05 | Visual Design | MEDIUM  ### 2. Set Up API Key

"Consider improving color contrast for better readability"  

💡 Use 4.5:1 contrast ratio minimum for accessibilityYour Gemini API key is already configured in `.env`:

``````



## 🛠️ Tech Stack```



- **Backend:** Flask (Python)### 3. Run the Application

- **AI:** Google Gemini 2.0 Flash Experimental

- **Frontend:** Vanilla HTML/CSS/JavaScript```bash

- **Computer Vision:** Canvas API for frame capturepython app.py

- **Media:** WebRTC for webcam access```



## 📁 Project Structure### 4. Open in Browser



```Navigate to: **http://localhost:5000**

shark-vision/

├── app_new.py           # Main Flask application## 📖 How to Use

├── templates/

│   ├── index.html       # Landing page### Upload Mode (Static Analysis)

│   └── recorder.html    # Main recorder interface

├── .env                 # API keys (create this)1. **Upload Your Slide(s)**:

├── .gitignore          # Git ignore rules   - Drag and drop an image or PDF file

├── requirements.txt    # Python dependencies   - Or click to browse and select a file

└── README.md          # This file   

```2. **Analyze**:

   - Click "Analyze Presentation" button

## 🔧 Configuration   - Wait for AI analysis (takes 5-15 seconds per slide)



### Environment Variables3. **Review Feedback**:

- `GEMINI_API_KEY` - Your Google Gemini API key ([Get one here](https://ai.google.dev/))   - See overall presentation score

   - View detailed breakdown for each slide

### API Rate Limits   - Read specific improvement suggestions

- Free tier: 50 requests per day   - Identify strengths and weaknesses

- Captures every 3 seconds to optimize quota usage

- Consider upgrading for higher usage### Live Recording Mode (Real-Time) 🆕



## 🎨 Features in Detail1. **Navigate to Recording Mode**:

   - Click "🎥 Switch to Live Recording Mode" on the home page

### Real-time Issue Detection   - Or go directly to: http://localhost:5000/recorder

- **Duplicate Prevention:** Uses content fingerprinting to avoid repeated issues

- **Severity Levels:** Critical, High, Medium, Low with color coding2. **Choose Your Source**:

- **Categorization:** Groups issues by presentation aspect   - Select "🖥️ Screen Share" to record your presentation screen

- **Actionable Suggestions:** Specific improvement recommendations   - Or select "📷 Webcam" to record yourself



### Comprehensive Reporting3. **Start Recording**:

- **Session Summary:** Duration, frames analyzed, total issues, average score   - Click "⏺️ Start Recording"

- **Issue Breakdown:** Count by severity level   - Allow screen/camera access when prompted

- **Chronological Timeline:** Issues sorted by when they occurred   - Present your slides normally

- **Professional Assessment:** Overall presentation quality evaluation

4. **Get Real-Time Feedback**:

## 🤝 Contributing   - Frames are captured every 2 seconds

   - AI analyzes automatically every 3 seconds

1. Fork the repository   - See live scores and suggestions

2. Create a feature branch (`git checkout -b feature/amazing-feature`)   - Click "🔍 Analyze Now" for immediate analysis

3. Commit changes (`git commit -m 'Add amazing feature'`)

4. Push to branch (`git push origin feature/amazing-feature`)5. **Stop & Review**:

5. Open a Pull Request   - Click "⏹️ Stop" when done

   - Review session statistics

## 📜 License   - All frames and analyses are saved



This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.6. **Session Data**:

   - Recordings saved in `/recordings/<session_id>/`

## 🙏 Acknowledgments   - Includes all captured frames

   - Complete analysis JSON with timestamps

- **Google Gemini AI** for powerful presentation analysis capabilities

- **Flask** for the lightweight web framework## 🎨 What Gets Analyzed

- **WebRTC** for seamless media access

### Text Clarity (0-10)

---- Font size and readability

- Text density and amount

**Made with ❤️ for better presentations**- Content hierarchy

- Grammar and spelling

*Perfect for educators, business professionals, students, and anyone who wants to deliver more effective presentations.*
### Visual Design (0-10)
- Color scheme appropriateness
- Color psychology alignment
- Visual balance and composition
- Whitespace usage

### Image Effectiveness (0-10)
- Image quality and relevance
- Visual storytelling
- Professional appearance
- Enhancement vs distraction

### Message Clarity (0-10)
- Main message clarity
- Supporting content alignment
- Logical flow
- Audience appropriateness

### Overall Impact (0-10)
- Memorability
- Professional impression
- Engagement potential
- Call-to-action clarity

## 🔧 Technical Details

- **Backend**: Flask (Python)
- **AI Model**: Google Gemini 2.0 Flash Experimental
- **Image Processing**: PIL/Pillow, OpenCV
- **PDF Handling**: pdf2image
- **PowerPoint**: python-pptx

## 📝 Tips for Best Results

1. **Clear Images**: Upload high-quality, well-lit slide images
2. **One Slide at a Time**: For detailed analysis, analyze slides individually
3. **PDF Format**: Use PDF for multi-slide presentations (analyzes up to 5 slides)
4. **Real Content**: Use actual presentation content (not just templates)

## 🎯 Use Cases

- **Presentation Prep**: Improve slides before important presentations
- **Design Review**: Get objective feedback on visual design
- **Content Check**: Ensure message clarity and alignment
- **Training**: Learn presentation best practices
- **A/B Testing**: Compare different slide versions

## 🛠️ Future Enhancements

- [ ] Full PowerPoint (.pptx) slide extraction
- [ ] Batch analysis of entire presentations
- [ ] Historical tracking and improvement metrics
- [ ] Custom analysis criteria
- [ ] Export reports as PDF
- [ ] Speaker notes analysis
- [ ] Animation and transition suggestions

## 📄 License

MIT License - Free to use and modify

---

**Built with ❤️ using Google Gemini API**
