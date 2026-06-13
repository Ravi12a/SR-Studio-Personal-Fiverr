import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from "fs";

const configPath = "firebase-applet-config.json";
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const app = initializeApp(config);
  // Default db is used in code
  const db = getFirestore(app);
  
  addDoc(collection(db, "gigs"), {
     title: "Premium Web Development",
     description: "I will build a professional, responsive website using React and Tailwind CSS with a modern UI design.",
     price: 15000,
     deliveryTime: 7,
     images: [],
     features: ["Responsive Design", "SEO Optimized", "Source Code", "Revisions"],
     createdAt: new Date(),
     updatedAt: new Date()
  }).then(docRef => {
     console.log("Successfully seeded 1 gig with id:", docRef.id);
     process.exit(0);
  }).catch(e => {
     console.error("Error seeding gig:", e);
     process.exit(1);
  });
} else {
  console.log("No config found. Can't connect.");
}
