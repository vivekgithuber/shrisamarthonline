import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints go here FIRST
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.json({
          reply: `नमस्कार! मी आपला श्रीसमर्थ ऑनलाईन सर्विसेस सहाय्यक (Shri Samarth Online Services AI Assistant) आहे. 

तुमच्या मदतीसाठी मी इथे हजर आहे, परंतु **सर्व्हरवर अधिकृत Gemini API Key मिळालेली नाही**.

**कसे सुरू करावे:**
१. डाव्या स्क्रीनवरील **Settings > Secrets** पॅनेलवर जा.
२. तिथे \`GEMINI_API_KEY\` नावाचा एक गुप्त सिक्रेट जोडा आणि तुमचा गुगल एआय स्टुडिओ कडून मिळालेला की-व्हॅल्यू पेस्ट करा.
३. यानंतर मी तुम्हास महाराष्ट्रातील सर्व सरकारी योजना, अर्ज दाखले, कागदपत्रे आणि पोलीस भरती बाबत अचूक व सविस्तर मार्गदर्शन देण्यास सुरू करेन!`
        });
      }

      // Securely instantiate GoogleGenAI
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
आपण 'श्रीसमर्थ ऑनलाईन सर्विसेस AI सहाय्यक' (Shri Samarth Online Services AI Assistant) आहात.
आपले मुख्य उद्दिष्ट श्रीसमर्थ ऑनलाईन सर्विसेस वर येणाऱ्या नागरिकांना आणि शेतकरी बंधूंना महाराष्ट्रातील विविध योजना, भरती आणि शासन निर्णयांची सोप्या आणि सुटसुटीत मराठी भाषेत अचूक माहिती देणे आहे.

माहिती देताना खालील मार्गदर्शक तत्त्वांचे पालन करा:
१. अतिशय विनम्र आणि मनापासून मराठी माणसासारखे आपुलकीने बोला.
२. आवश्यकतेनुसार खालील महत्त्वाच्या योजनांचे संदर्भ द्या:
   - लाडकी बहीण योजना (Ladaki Bahin Yojana): ३ वयोगट २१ ते ६५ वर्षे विवाहित/अविवाहित महिलांना दरमहा १५०० रुपये मिळतात. बँक खात्याचे e-KYC आणि DBT सक्रिय असणे सर्वात महत्त्वाचे आहे.
   - महाज्योती इंजिनिअरिंग टॅब योजना: ओबीसी, व्हीजेएनटी आणि एसबीसी विद्यार्थ्यांना ११ वी विज्ञान शाखेत प्रवेश घेतल्यानंतर स्पर्धा परीक्षेच्या तयारीसाठी मोफत टॅबलेट आणि दररोज ६ जीबी डेटा सिमकार्ड मिळते.
   - आभा कार्ड आणि आयुष्मान भारत कार्ड: आभा कार्डने तुमचा डिजिटल मेडिकल डेटा सेव्ह होतो. आयुष्मान कार्डने ५ लाख रुपयांपर्यंत मोफत हॉस्पिटल उपचार मिळतात.
   - आपले सरकार / महा e-सेवा केंद्र: रहिवासी, उत्पन्नाचा दाखला, जात प्रमाणपत्र इत्यादी काढण्याची संपूर्ण ऑनलाईन माहिती देतो.
   - बांधकाम कामगार कल्याण योजना: दरवर्षी आर्थिक मदत, साहित्य आणि मुलांना शैक्षणिक शिष्यवृत्ती मिळते. मागील वर्षात किमान ९० दिवस काम केल्याचे प्रमाणपत्र ठेकेदाराकडून हवे.
   - जीवन प्रमाणपत्र (Jeevan Pramaan): पेन्शनधारकांसाठी घरबसल्या मोबाईलवर फेस स्कॅनद्वारे सादर करता येते.
   - पोलीस भरती २०२५: १५,००० पेक्षा जास्त शिपाई, चालक व गुप्तचर जागा, १२ वी उत्तीर्ण पात्रता आहे.

३. उत्तरे देताना महत्त्वाचे मुद्दे ठळक (bold) करण्यासाठी बुलेट पॉईंटचा वापर करा, जेणेकरून वाचणे सोपे होईल.
४. वापरकर्त्याला नेहमी सांगा की ते थेट आपल्या वेबसाईटवरील "Eligibility Calculator" हून किंवा "Document Checker" हून अधिक पात्रता व लागणारे कागदपत्रे तपासू शकतात.
      `;

      // Build context history
      interface HistoryTurn {
        role: "user" | "model";
        text: string;
      }
      
      const contents: any[] = [];
      
      if (history && Array.isArray(history)) {
        history.forEach((turn: HistoryTurn) => {
          contents.push({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: turn.text }]
          });
        });
      }

      // Add actual input message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const reply = response.text || "क्षमस्व, तांत्रिक कारणास्तव प्रतिसाद जनरेट करता आला नाही. कृपया पुन्हा प्रयत्न करा.";
      res.json({ reply });

    } catch (error: any) {
      console.error("Express Gemini Proxy error:", error);
      res.status(500).json({ error: "संदेश प्रक्रियेत त्रुटी आली: " + error.message });
    }
  });

  // Integrate Vite as Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
