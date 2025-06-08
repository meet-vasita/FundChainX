import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from '../config/aws.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const file = req.file;
    const uniqueFileName = `campaign-images/${uuidv4()}${path.extname(file.originalname)}`;
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const command = new PutObjectCommand(params);
      try {
        const response = await s3Client.send(command);
        console.log('S3 Upload Success:', response);
        const imageUrl = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
        res.status(200).json({
          message: 'Image uploaded successfully',
          imageUrl: imageUrl
        });c
      } catch (s3Error) {
        console.error('Detailed S3 Upload Error:', {
          errorName: s3Error.name,
          errorMessage: s3Error.message,
          errorStack: s3Error.stack,
          errorCode: s3Error.$metadata?.httpStatusCode,
          errorRequestId: s3Error.$metadata?.requestId
        });
        res.status(500).json({
          message: 'Failed to upload image to S3',
          error: s3Error.message,
          errorDetails: {
            name: s3Error.name,
            code: s3Error.$metadata?.httpStatusCode,
            requestId: s3Error.$metadata?.requestId
          }
        });
      }
    } catch (error) {
      console.error('S3 Client Error:', error);
      res.status(500).json({
        message: 'S3 Client Error',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      message: 'Image upload failed',
      error: error.message
    });
  }
};