import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import transactionsRouter from "./transactions";
import moneyRequestsRouter from "./moneyRequests";
import paymentMethodsRouter from "./paymentMethods";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(transactionsRouter);
router.use(moneyRequestsRouter);
router.use(paymentMethodsRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
