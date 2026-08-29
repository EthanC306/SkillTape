import { Router } from "express";
import db from "../db.js";
import { requireUser } from "../userScope.js";

const router = Router();
const listCourses = db.prepare(`
  SELECT id, title, subtitle, owner_id AS ownerId
  FROM courses
  WHERE owner_id IS NULL OR owner_id = @userId
  ORDER BY CASE WHEN owner_id IS NULL THEN 0 ELSE 1 END, position, title
`);
const getCourse = db.prepare("SELECT id FROM courses WHERE id = ?");
const nextPosition = db.prepare(
  "SELECT COALESCE(MAX(position), -1) + 1 AS position FROM courses WHERE owner_id = ?"
);
const insertCourse = db.prepare(`
  INSERT INTO courses (id, title, subtitle, position, owner_id)
  VALUES (@id, @title, @subtitle, @position, @ownerId)
`);

function clean(value, name, required = false) {
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  const result = value.trim();
  if (required && !result) throw new Error(`${name} must not be blank`);
  if (result.length > 200) throw new Error(`${name} exceeds 200 characters`);
  return result;
}

function slug(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course";
}

router.get("/", (req, res) => {
  if (req.userId == null) return res.json([]);
  res.json(listCourses.all({ userId: req.userId }));
});

router.post("/", requireUser, (req, res) => {
  let title;
  let subtitle;
  try {
    title = clean(req.body?.title, "title", true);
    subtitle = clean(req.body?.subtitle ?? "", "subtitle");
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const base = `user-${req.userId}-${slug(title)}`;
  let id = base;
  let suffix = 2;
  while (getCourse.get(id)) id = `${base}-${suffix++}`;
  insertCourse.run({
    id,
    title,
    subtitle: subtitle || null,
    position: nextPosition.get(req.userId).position,
    ownerId: req.userId,
  });
  res.status(201).json({ id, title, subtitle: subtitle || null, ownerId: req.userId });
});

export default router;
