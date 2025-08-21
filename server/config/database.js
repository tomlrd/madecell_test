import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // Gestion des événements de connexion
    mongoose.connection.on("error", (err) => {
      console.error("Erreur de connexion MongoDB:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB déconnecté");
    });

    // Gestion de la fermeture propre
    process.on("SIGINT", async () => {
      // SIGINT = ctrl + c
      await mongoose.connection.close();
      console.log("Connexion MongoDB fermée suite à l'arrêt de l'application");
      // process.exit(0) : Arrêt propre et normal de l'application
      // Code 0 = succès, pas d'erreur, fermeture volontaire
      process.exit(0);
    });
  } catch (error) {
    console.error("Erreur lors de la connexion à MongoDB:", error);
    // process.exit(1) : Arrêt forcé suite à une erreur critique
    // Code 1 = erreur, impossible de continuer sans base de données
    process.exit(1);
  }
};

export default connectDB;
