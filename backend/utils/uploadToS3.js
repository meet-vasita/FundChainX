import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from '../config/aws.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const uploadToS3 = async (file) => {
  const uniqueFileName = `campaign-images/${uuidv4()}${path.extname(file.originalname)}`;
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: uniqueFileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw error;
  }
};

export default uploadToS3;