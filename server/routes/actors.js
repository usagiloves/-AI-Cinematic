const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { config } = require('../config');

const actorsFile = path.join(config.dataDir, 'actors.json');

function loadActors() {
  try {
    if (fs.existsSync(actorsFile)) {
      return JSON.parse(fs.readFileSync(actorsFile, 'utf8'));
    }
  } catch (e) {
    console.warn('Failed to load actors:', e.message);
  }
  return [];
}

function saveActors(actors) {
  fs.writeFileSync(actorsFile, JSON.stringify(actors, null, 2));
}

// GET /api/actors — list all actors
router.get('/', (req, res) => {
  const actors = loadActors();
  res.json(actors);
});

// GET /api/actors/:id — get single actor
router.get('/:id', (req, res) => {
  const actors = loadActors();
  const actor = actors.find(a => a.id === req.params.id);
  if (!actor) return res.status(404).json({ error: 'Actor not found' });
  res.json(actor);
});

// POST /api/actors — create or update actor
router.post('/', (req, res) => {
  const { id, name, gender, hairStyle, outfit, description, traits } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const actors = loadActors();

  if (id) {
    // Update existing
    const idx = actors.findIndex(a => a.id === id);
    if (idx >= 0) {
      actors[idx] = { ...actors[idx], name, gender, hairStyle, outfit, description, traits, updatedAt: Date.now() };
      saveActors(actors);
      return res.json(actors[idx]);
    }
  }

  // Create new
  const newActor = {
    id: `actor_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name,
    gender: gender || '',
    hairStyle: hairStyle || '',
    outfit: outfit || '',
    description: description || '',
    traits: traits || [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  actors.push(newActor);
  saveActors(actors);
  res.status(201).json(newActor);
});

// DELETE /api/actors/:id — delete actor
router.delete('/:id', (req, res) => {
  let actors = loadActors();
  const idx = actors.findIndex(a => a.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Actor not found' });

  const deleted = actors.splice(idx, 1)[0];
  saveActors(actors);
  res.json({ message: 'Actor deleted', actor: deleted });
});

// POST /api/actors/:id/generate-prompt — generate SD prompt snippet for this actor
router.post('/:id/generate-prompt', (req, res) => {
  const actors = loadActors();
  const actor = actors.find(a => a.id === req.params.id);
  if (!actor) return res.status(404).json({ error: 'Actor not found' });

  // Build character-consistent prompt fragment
  const parts = [];
  if (actor.name) parts.push(actor.name);
  if (actor.gender) parts.push(actor.gender);
  if (actor.hairStyle) parts.push(`${actor.hairStyle} hair`);
  if (actor.outfit) parts.push(`wearing ${actor.outfit}`);
  if (actor.description) parts.push(actor.description);
  if (actor.traits && actor.traits.length > 0) parts.push(actor.traits.join(', '));

  const promptFragment = parts.join(', ');
  res.json({ promptFragment, actor });
});

module.exports = router;
