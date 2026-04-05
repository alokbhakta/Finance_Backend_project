import mongoose from "mongoose";
import Record from "../models/record.model.js";
import User from "../models/user.model.js";

export const summary = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole === "admin" || userRole === "analyst") {

      const users = await User.find().select("_id name email role");

      const data = await Promise.all(
        users.map(async (user) => {

          const result = await Record.aggregate([
            {
              $match: {
                userId: new mongoose.Types.ObjectId(user._id)
              }
            },
            {
              $group: {
                _id: "$type",
                total: { $sum: "$amount" }
              }
            }
          ]);

          let totalIncome = 0;
          let totalExpense = 0;

          result.forEach(item => {
            if (item._id === "income") totalIncome = item.total;
            if (item._id === "expense") totalExpense = item.total;
          });

          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense
          };
        })
      );

      return res.json(data);
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const result = await Record.aggregate([
      {
        $match: { userId }
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    result.forEach(item => {
      if (item._id === "income") totalIncome = item.total;
      if (item._id === "expense") totalExpense = item.total;
    });

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const trends = async (req, res) => {
  try {
    const userRole = req.user.role;
    const match = {};

    if (userRole === "viewer") {
      match.userId = new mongoose.Types.ObjectId(req.user.id);
    }

    const results = await Record.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type"
          },
          total: { $sum: "$amount" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    const trendsMap = {};

    results.forEach(item => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
      if (!trendsMap[key]) {
        trendsMap[key] = { month: key, income: 0, expense: 0, balance: 0 };
      }
      if (item._id.type === "income") trendsMap[key].income = item.total;
      if (item._id.type === "expense") trendsMap[key].expense = item.total;
    });

    const trendsArray = Object.values(trendsMap).map(t => ({
      ...t,
      balance: t.income - t.expense
    }));

    res.json(trendsArray);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};