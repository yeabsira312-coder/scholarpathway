import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Home page
router.get("/", async (req, res) => {
  try {
    const { data: scholarships } = await supabase
      .from("scholarships")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    res.render("pages/home", { title: "Home", scholarships });
  } catch (error) {
    console.error(error);
    res.status(500).render("pages/500", { title: "Server Error" });
  }
});

// Scholarships page
router.get("/scholarships", async (req, res) => {
  try {
    const { data: scholarships } = await supabase
      .from("scholarships")
      .select("*")
      .order("created_at", { ascending: false });

    res.render("pages/scholarships", { title: "Scholarships", scholarships });
  } catch (error) {
    console.error(error);
    res.status(500).render("pages/500", { title: "Server Error" });
  }
});

// Tips page
router.get("/tips", (req, res) => {
  res.render("pages/tips", { title: "Study Tips" });
});

export default router;
