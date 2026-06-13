import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const configPath = "firebase-applet-config.json";
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const app = initializeApp(config);
  const db = getFirestore(app);
  
  getDocs(collection(db, "gigs")).then(snapshot => {
     console.log("Total gigs:", snapshot.size);
     snapshot.forEach(doc => console.log(doc.id, doc.data().title));
     process.exit(0);
  }).catch(e => {
     console.error("Error fetching gigs:", e);
     process.exit(1);
  });
} else {
  console.log("No config found. Can't connect.");
}
