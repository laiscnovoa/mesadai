import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import familyRouter from "./family";
import tasksRouter from "./tasks";
import submissionsRouter from "./submissions";
import goalsRouter from "./goals";
import betsRouter from "./bets";
import storageRouter from "./storage";
import devicesRouter from "./devices";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(familyRouter);
router.use(tasksRouter);
router.use(submissionsRouter);
router.use(goalsRouter);
router.use(betsRouter);
router.use(storageRouter);
router.use(devicesRouter);

export default router;
