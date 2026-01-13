# LogAuto Fill AI

🏭 **Industrial Intelligence** - Handwritten log data extraction with AI-powered OCR

## Features

- **Industrial OCR**: Extracts handwritten data from paper logs using Gemini 3 Flash
- **Voice Input**: Speech-to-text for quick manual entry with industrial digit mapping
- **Google Sheets Integration**: Real-time cloud sync with automated data validation
- **Dark/Light Mode**: Professional UI optimized for industrial environments
- **Responsive Design**: Works on tablets, phones, and desktop workstations

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **AI**: Google Gemini 3 Flash (Vision API)
- **Backend**: Google Apps Script + Sheets API
- **Deployment**: Vercel

## Quick Start

1. **Clone & Install**
   ```bash
   git clone https://github.com/Sharshi2006/dop.git
   cd dop
   npm install
   ```

2. **Environment Setup**
   Create `.env.local`:
   ```
   VITE_API_KEY=your_gemini_api_key_here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect your repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `VITE_API_KEY`: Your Gemini API key

### Manual Deployment

```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## Configuration

### Google Gemini API
1. Visit [Google AI Studio](https://aistudio.google.com)
2. Create an API key
3. Add to environment variables

### Google Sheets Integration
The app uses a pre-configured Google Apps Script for data sync. To use your own sheet:

1. Create a new Google Sheet
2. Deploy the Apps Script from `/docs/apps-script.js`
3. Update `SCRIPT_URL` in `services/sheetService.ts`

## Usage

1. **Quick Entry**: Use the form with voice input for rapid data entry
2. **OCR Scan**: Upload photos of handwritten logs for batch processing
3. **History**: View and search synced records in real-time
4. **Export**: Data automatically syncs to Google Sheets

## Industrial Features

- **Digit Recognition**: Distinguishes between '0'/'O', '5'/'S', '1'/'I'
- **13-Digit SC Numbers**: Validates service connection number format
- **Multi-Row Processing**: Handles table-style paper forms
- **Quality Validation**: Confidence scoring for OCR results

## Browser Compatibility

- Chrome 90+ (Recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

For issues or feature requests, please open an issue on GitHub.

---

**Built for Industrial Excellence** 🏭⚡
- Edge 90+

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

For issues or feature requests, please open an issue on GitHub.

---

**Built for Industrial Excellence** 🏭⚡
=======
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hrTGZRVYosLxIdbn9eTQpyoN5dkYk9Fk

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
>>>>>>> fa9514ac7527beaf95ff2eee2181ed3a6ab98bdb
