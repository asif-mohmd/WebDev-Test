var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
var objectId=require('mongodb').ObjectID
// @ts-ignore
const { response } = require('express')
const Razorpay=require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_PqTVda4wEWxalf',
    key_secret: '7psKsDAook7Ds7l0UHH4mISC',
  }); 

module.exports={
    doSignup:(userData)=>{
        // @ts-ignore
        return new Promise(async(resolve,reject)=>{
            console.log(userData)
            userData.Password=await bcrypt.hash(userData.Password,10)
            
            // @ts-ignore
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
           
            resolve(userData)           
        })
        })

    },

    doLogin:(userData)=>{
        
        // @ts-ignore
        return new Promise(async (resolve,reject)=>{
            // @ts-ignore
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        console.log("login success");
                        response.user=user
                        response.status=true
                        console.log(response);
                        resolve(response)
                    }else{
                        console.log('login failed');
                        resolve({status:false})
                    }
                })
            }else{
                console.log('login failed');
                resolve({status:false})
            }
            

        })
    },

    addToCart:(proId,userId)=>{
        let proObj={
            // @ts-ignore
            item:objectId(proId),
            quantity:1
        }
        // @ts-ignore
        return new Promise(async(resolve,reject)=>{
            // @ts-ignore
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})

            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)
                
                if(proExist!=-1){
                    // @ts-ignore
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
                // @ts-ignore
                db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId)},
                {
                   
                       $push:{products:(proObj)}
                   }
                
                // @ts-ignore
                ).then((response)=>{
                    resolve()
                })
            }  
            }else{
                let cartObj={
                    // @ts-ignore
                    user:objectId(userId),
                    products:[proObj]
                }
                // @ts-ignore
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{

        // @ts-ignore
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    // @ts-ignore
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        // 1 is for Display , if its 0 it wont display
                    }
                } 
            
            ]).toArray()
            
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        // @ts-ignore
        return new Promise(async(resolve,reject)=>{
            let count=0
            // @ts-ignore
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },

    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
        
      
        // @ts-ignore
        return new Promise((resolve,reject)=>{

            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                // @ts-ignore
                .updateOne({_id:objectId(details.cart)},
                        {
                            // @ts-ignore
                            $pull:{products:{item:objectId(details.product)}}
                        }
                        // @ts-ignore
                        ).then((response)=>{
                            resolve({removeProduct:true})
                        })
                    }else{        

            // @ts-ignore
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart), 'products.item':objectId(details.product)},
                    {
                        $inc:{'products.$.quantity':details.count}
                    }
                    // @ts-ignore
                    ).then((response)=>{
                        resolve({status:true})
                    })
                }

        })
    },
     getTotalAmount:(userId)=>{
        // @ts-ignore
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    // @ts-ignore
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                        
                        total:{$sum:{$multiply: ['$quantity', {$toInt: '$product.Price'}]}}
                    }
                }
            
            ]).toArray()
          
            resolve(total[0].total)
        })
   
    },


    removeItem:(details)=>{

        // @ts-ignore
        return new Promise((resolve,reject)=>{

        db.get().collection(collection.CART_COLLECTION)
                // @ts-ignore
                .updateOne({_id:objectId(details.cart)},
                        {
                            // @ts-ignore
                            $pull:{products:{item:objectId(details.product)}}
                        }
                        // @ts-ignore
                        ).then((response)=>{
                            
                            resolve({removeProduct:true})
                        })
          }

      )},

      placeOrder:(order,products,total)=>{
          // @ts-ignore
          return new Promise((resolve,reject)=>{
        
              
              let status=order['payment-method']==='COD'?'placed':'pending'
              let orderObj={
                  deliveryDetails:{
                      mobile:order.mobile,
                      adress:order.address,
                      pincode:order.pincode
                  },
                  // @ts-ignore
                  userId:objectId(order.userId),
                  paymentMethod:order['payment-method'],
                  products:products,
                  totalAmount:total,
                  status:status,
                  date:new Date()
              }

              db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                  // @ts-ignore
                  db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                  resolve(response.insertedId)
              })

          })

      },
      getCartProductList:(userId)=>{
          // @ts-ignore
          return new Promise(async(resolve,reject)=>{
              // @ts-ignore
              let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
              console.log(cart)
              resolve(cart.products)

            })
      },
      getUserOrders:(userId)=>{
        // @ts-ignore
        return new Promise(async(resolve,reject)=>{
            // @ts-ignore
            let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
           
            resolve(orders)
        })
    },

    getOrderProducts:(orderId)=>{
        // @ts-ignore
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    // @ts-ignore
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products',
                    
                },{
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'products'
                    }
                },
                {
                    $project:{
                       item:1,quantity:1,products:{$arrayElemAt:['$products',0]}
                    }
                }
    
            ]).toArray()
            console.log(orderItems);
            resolve(orderItems)
            
        })
    },

    generateRazorpay:(orderId,total)=>{
        // @ts-ignore
        return new Promise((resolve,reject)=>{

            instance.orders.create({
                
                amount: total*100,
                currency: "INR",
                receipt: ""+orderId,
                notes: {
                  key1: "value3",
                  key2: "value2"
                }},(err,order)=>{
                    if(err){
                      
                       console.log(err);
                    }else{
                        console.log("New Order :",order);
                       
                        resolve(order)
                    }
                    
                }
            )
          
          
            })
    },
    
    verifyPayment:(details)=>{
            return new Promise((resolve,reject)=>{
                const crypto = require('crypto');
                let hmac = crypto.createHmac('sha256', '7psKsDAook7Ds7l0UHH4mISC');

                hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
                // @ts-ignore
                hmac=hmac.digest('hex')
                if(hmac==details['payment[razorpay_signature]']){
                    resolve()
                }else{
                    reject()
                }
            })
    },
    


    changePaymentStatus:(orderId)=>{
        // @ts-ignore
        return new Promise(async(resolve,reject)=>{
           
          // @ts-ignore
          let  dbs=await  db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objectId(orderId)})
            if(dbs){
                console.log('sdbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
            }else{
                console.log('dbnot founddddddddddddddddddddddddddddddddddddddddddddddddddddddd')
            }

            // @ts-ignore
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    }





}