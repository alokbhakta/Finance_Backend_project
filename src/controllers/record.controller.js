import mongoose from "mongoose";
import Record from "../models/record.model.js";


// Create Record
export const createRecord = async (req, res) => {
  try {

    const { userId, amount, type, category, date, notes } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can create records"
      });
    }

    const record = await Record.create({
      userId,
      amount,
      type,
      category,
      date,
      notes,
      createdBy: req.user.id
    });

    res.status(201).json(record);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



// Get Records
export const getRecords = async (req, res) => {
  try {

    let filter = {};

    if (req.user.role === "viewer") {
      filter.userId = new mongoose.Types.ObjectId(req.user.id);
    }

    const { type, category, search, page = 1, limit = 10 } = req.query;

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    // Search
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } }
      ];
    }

    const records = await Record.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Record.countDocuments(filter);

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      records
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server error"
    });
  }
};



// Update Record
export const updateRecord = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can update records"
      });
    }

    const record = await Record.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!record) {
      return res.status(404).json({
        message: "Record not found"
      });
    }

    res.json({
      message: "Record updated successfully",
      record
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};



// Delete Record
export const deleteRecord = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can delete records"
      });
    }

    const record = await Record.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({
        message: "Record not found"
      });
    }

    res.json({
      message: "Record deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};