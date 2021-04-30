import { v4 as uuidv4 } from 'uuid';
import ErrorResponse from '../utils/errorResponse.js';
import {
  fetchProducts,
  fetchReviews,
  writeProducts,
  writeProductsPics,
} from '../utils/fsUtils.js';

import { createCSV } from '../utils/csv/csv.js';
import { generatePDF } from '../utils/pdf/index.js';
import ProductModel from '../models/Products.js';
import mongoose from 'mongoose';
import q2m from 'query-to-mongo';

// @desc    Get all products by query
//& @route   GET /products? ✅
export const getProductsByQuery = async (req, res, next) => {
  try {
    if (Object.keys(req.query).length > 0) {
      const query = q2m(req.query);
      const total = await ProductModel.countDocuments(query.criteria);
      console.log(query.criteria);
      console.log(query.options);

      const products = await ProductModel.find(
        {
          name: {
            $regex: new RegExp(query.criteria.name, 'i'),
          },
        },
        query.options.fields
      )
        .skip(query.options.skip)
        .limit(query.options.limit)
        .sort(query.options.sort);

      res.status(200).send({
        success: true,
        next: `${req.protocol}://${req.get('host')}${
          query.links('/products', total).next
        }`,
        previous: `${req.protocol}://${req.get('host')}${
          query.links('/products', total).previous
        }`,
        total,
        data: products,
      });
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// @desc    Get all products
//& @route   GET /products ✅
export const getProducts = async (req, res, next) => {
  try {
    const products = await ProductModel.find({});
    res
      .status(200)
      .send({ success: true, count: `${products.length}`, data: products });
  } catch (error) {
    next(error);
  }
};
// @desc    Get a product
// @route   GET /products/:id  ✅
export const getProduct = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (product) {
      res.status(201).send(product);
    } else {
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    add product
//& @route   POST /products ✅
export const addProduct = async (req, res, next) => {
  try {
    const newProd = { ...req.body };
    const savedProd = await ProductModel.create(newProd);
    const { _id } = savedProd;
    res.status(201).send({ success: true, _id: _id });
  } catch (error) {
    return next(error);
  }
};

// @desc    modify  product
// @route   PUT /products/:id

export const modifyProduct = async (req, res, next) => {
  try {
    let product = await ProductModel.findById(req.params.id);
    console.log(product);
    if (product) {
      let modifiedProduct = await ProductModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          runValidators: true,
          new: true,
          useFindAndModify: false,
        }
      );
      if (modifiedProduct) {
        res.status(200).send(modifiedProduct);
      } else {
        next();
      }
    } else {
      console.log(error);
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    delete product
//& @route   DELETE /products/:id ✅

export const deleteProduct = async (req, res, next) => {
  try {
    const prod = await ProductModel.findByIdAndDelete(req.params.id);
    if (!prod) {
      return next(new ErrorResponse('resource not found', 404));
    }
    res.status(200).send({ success: true, message: 'product removed' });
  } catch (error) {
    next(error);
  }
};

// REVIEWS--------------------------------------

// @desc    add reviews for a product
//& @route   POST /products/:id/reviews ✅
export const postReviewOnProductId = async (req, res, next) => {
  try {
    const rev = { ...req.body };
    const savedRev = await ProductModel.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reviews: rev,
        },
      },
      { runValidators: true, new: true, projection: { reviews: 1 } }
    );

    res.status(201).send({ success: true, data: savedRev });
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req, res, next) => {
  try {
    // deconstructed reviews object uses mongoose method findbyId with Product id from the params.
    const { reviews } = await ProductModel.findById(req.params.id, {
      reviews: 1,
      _id: 0,
    });

    res.status(200).send(reviews);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const modifyReview = async (req, res, next) => {
  try {
    const modifiedReview = await ProductModel.findOneAndUpdate(
      {
        _id: mongoose.Types.ObjectId(req.params.id),
        'reviews._id': mongoose.Types.ObjectId(req.params.revId),
      },
      { $set: { 'reviews.$': req.body } }, // The concept of the $ is pretty similar as having something like const $ = array.findIndex(item) => item._id === req.params.reviewId)
      {
        runValidators: true,
        new: true,
      }
    );

    if (modifiedReview) {
      res.status(201).send(modifiedReview);
    } else {
      res.status(400).send('Product id not found');
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const modifiedReview = await ProductModel.findByIdAndUpdate(
      req.params.id,
      {
        $pull: {
          reviews: { _id: mongoose.Types.ObjectId(req.params.revId) },
        },
      },
      {
        new: true,
      }
    );
    if (modifiedReview) {
      res.status(202).send(modifiedReview);
    } else {
      res.status(400).send('Review id not found');
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};

///::::::::::::::::::::::::::::>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// ========== OTHERS ================
///::::::::::::::::::::::::::::>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// @desc    GET product pdf
// @route   GET /products/:id/pdf

export const getProductPDF = async (req, res, next) => {
  try {
    const products = await fetchProducts();
    if (products.some((prod) => prod._id === req.params.id)) {
      const data = products.find((prod) => prod._id === req.params.id);
      const sourceStream = await generatePDF(data);
      res.attachment('data.pdf');

      // pipeline(sourceStream, res, () => {

      //   console.log('hi');
      // });
      await asyncPipeline(sourceStream, res);

      res.send('ciao');
    } else {
      next(new ErrorResponse('Product not found', 404));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get  products CSV
// @route   GET /products/exportToCSV
export const getProductsCsv = async (req, res, next) => {
  try {
    res.attachment('products.csv');
    await createCSV(res);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
// @desc    add image to product
// @route   POST /products/:id/upload
export const uploadProductPic = async (req, res, next) => {
  try {
    const products = await fetchProducts();
    if (products.some((prod) => prod._id === req.params.id)) {
      // console.log(req.file);
      // const { buffer, originalname } = req.file;
      // const filename = req.params.id + extname(originalname);
      // const imgUrl = `${req.protocol}://${req.get(
      //   'host'
      // )}/img/products/${filename}`;
      // //scrivo nel file url
      const newProducts = products.reduce((acc, cv) => {
        if (cv._id === req.params.id) {
          cv.imgUrl = req.file.path;
          cv.updatedAt = new Date();
          acc.push(cv);
          return acc;
        }
        acc.push(cv);
        return acc;
      }, []);
      await writeProducts(newProducts);
      // await writeProductsPics(filename, buffer); non serve scrivere, vado su cloudinary
      // console.log(req.file);
      res.status(200).send({ success: true, cloudinaryUrl: req.file.path });
    } else {
      next(new ErrorResponse('Product not found', 404));
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
};
