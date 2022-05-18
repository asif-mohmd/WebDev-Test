// @ts-ignore
const { Collection, ObjectId } = require('mongodb');
var db=require('../config/connection')
var collection=require('../config/collections')
var objectId=require('mongodb').ObjectID

module.exports={

    addProduct:(product,display)=>{
        
        
        db.get().collection('product').insertOne(product).then((data)=>{
            
            display(data.insertedId)
        })

    },
    getAllProducts:()=>{
        // @ts-ignore
        return new Promise(async (resolve,reject)=>{
            let product=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(product)
        })
    },

    deleteProduct:(prodId)=>{
        // @ts-ignore
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:new objectId(prodId)}).then((response)=>{
                
                resolve(response)
            })
        })
    },
    getProductDetails:(prodId)=>{
        // @ts-ignore
        return new Promise((resolve,reject)=>{
            // @ts-ignore
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((product)=>{
                resolve(product)
        })
        })
    },
    updateProduct:(proId,ProDetails)=>{
        // @ts-ignore
        return new Promise((resolve,reject)=>{
            // @ts-ignore
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(proId)},{
                $set:{
                    Name:ProDetails.Name,
                    Description:ProDetails.Description,
                    Price:ProDetails.Price,
                    Category:ProDetails.Category 
                }

            // @ts-ignore
            }).then((response)=>{
                resolve()
            })
        })
    }


}