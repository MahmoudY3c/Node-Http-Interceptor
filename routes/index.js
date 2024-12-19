const { Router } = require("express");
const { mainRouter } = require("./main");

const router = Router();

router.use('/', mainRouter);

module.exports = router;
