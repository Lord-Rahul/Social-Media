import mongoose, { Schema } from "mongoose";
import mongoosAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
  {
    videoFile: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: string,
      required: true,
    },
    title: {
      type: string,
      required: true,
    },
    descreption: {
      type: string,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongoosAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
