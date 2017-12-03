const express = require('express');
const router = express.Router();
const ObjectID = require('mongodb').ObjectID


/**
 * Gets all root nodes
 */
router.get('/', (req, res) => {
  const col = req.app.get('db').collection('notes');
  col.find({ parent: null}).toArray((err, notes) => {
    res.send(notes);
  })
});

/**
 * Creates a new note
 */
router.post('/', (req, res) => {
  const col = req.app.get('db').collection('notes');
  const { _id, parent } = req.body;
  
  if(parent) {
    const note = { _id, parent };
    col.findOne({ _id: parent}, (err, parentDoc) => {
      if(!parentDoc) {
        return res.send(`Could not find parentId: ${parent}`, 404);
      }
      note.ancestors = parentDoc.ancestors.concat(parentDoc._id);
      col.insertOne(note, (err, result) => {
        res.send(note);
      });
    });
  }
  else {
    const note = { _id, parent: null, ancestors: [] };
    col.insertOne(note, (err, result) => {
      res.send(note);
    });
  }
});

/**
 * Loads a node and it´s children
 */
router.get('/:_id', (req, res) => {
  const col = req.app.get('db').collection('notes');
  const { _id } = req.params;
  
  col.findOne({ _id }, (err, note) => {
    if(!note) {
      return res.send(`Could not find note with id: ${_id}`, 404);
    }
    col.find({ parent: note._id}).toArray((err, children) => {
      note.children = children;
      res.send(note);
    })
  });
});

/**
 * Moves a node into another
 */
router.get('/move/:src/:target', (req, res) => {
  const col = req.app.get('db').collection('notes');
  const { src, target } = req.params;
  
  if(src === target) {
    return res.send(`Can not move a node into hisself`, 404);
  }
  
  col.findOne({ _id: src}, (err, srcNote) => {
    if(!srcNote) {
      return res.send(`Could not find source note with id: ${src}`, 404);
    }
    col.findOne({ _id: target }, (err, targetNote) => {
      if(!targetNote) {
        return res.send(`Could not find target note with id: ${target}`, 404);
      }
      if(targetNote.ancestors.indexOf(src) !== -1) {
        return res.send(`Can not move a note into one of his descendants`, 404);
      }
      
      const ancestors = targetNote.ancestors.concat(targetNote._id);
      col.findOneAndUpdate({ _id: src }, { $set: { parent: target, ancestors }}, { returnOriginal: false }, (err, result) => {
          const note = result.value;
          col.find({ ancestors: note._id}).toArray((err, descendants) => {
            descendants.forEach(descendant => {
              descendant.ancestors = note.ancestors.concat(descendant.ancestors.slice(descendant.ancestors.indexOf(note._id)));
              col.save(descendant);
            });
          });
          
          res.send(note);
      });
    });
  });
});

/**
 * Deletes a note it´s descendants
 */
router.delete('/:_id', (req, res) => {
  const col = req.app.get('db').collection('notes');
  const { _id } = req.params;
  
  col.findOne({ _id }, (err, note) => {
    if(!note) {
      return res.send(`Could not find note with id: ${_id}`, 404);
    }
    col.remove({ $or: [{ _id }, { ancestors: _id }]}, (err, result) => {
        res.send(note);
    });
  });
});

module.exports = router;