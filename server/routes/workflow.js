const express = require('express');
const router = express.Router();
const workflowEngine = require('../services/workflow-engine');

// POST /api/workflow/execute - Run a workflow
router.post('/execute', async (req, res) => {
  try {
    const { templateId, input } = req.body;
    if (!templateId || !input) return res.status(400).json({ error: 'templateId and input required' });

    const broadcast = req.app.get('broadcast');
    const workflow = await workflowEngine.executeWorkflow(templateId, input, broadcast);

    res.json({
      id: workflow.id,
      status: workflow.status,
      results: workflow.results,
      steps: workflow.steps.map(s => ({ name: s.name, status: s.status, type: s.type })),
      duration: workflow.endTime - workflow.startTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workflow/execute-step - Run a single workflow step
router.post('/execute-step', async (req, res) => {
  try {
    const { templateId, stepIndex, input, prevResults } = req.body;
    if (templateId === undefined || stepIndex === undefined || !input) {
      return res.status(400).json({ error: 'templateId, stepIndex, and input are required' });
    }

    const broadcast = req.app.get('broadcast');
    const result = await workflowEngine.executeWorkflowStep(
      templateId,
      parseInt(stepIndex),
      input,
      prevResults || {},
      broadcast
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workflow/templates - List workflow templates
router.get('/templates', (req, res) => {
  try {
    const templates = workflowEngine.getTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workflow/status/:id - Check workflow status
router.get('/status/:id', (req, res) => {
  try {
    const workflow = workflowEngine.getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    res.json({
      id: workflow.id,
      status: workflow.status,
      steps: workflow.steps.map(s => ({ name: s.name, status: s.status, type: s.type })),
      error: workflow.error
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
