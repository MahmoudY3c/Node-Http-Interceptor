const { Router } = require("express");

const mainRouter = Router();

mainRouter.use('/track', (req, res) => res.render('index'));

module.exports = { mainRouter };
