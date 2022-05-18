// @ts-ignore
const { response } = require('express');
var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers')
const userHelpers=require('../helpers/user-helpers')

const verifyLogin=(req,res,next)=>{
    if(req.session.userLoggedIn){
        next()
    }else{
        res.redirect('/login')
    }
}


/* GET home page.*/
// @ts-ignore
router.get('/', async function(req, res, next) {

    // @ts-ignore
    let user=req.session.user
    let cartCount=null
    // @ts-ignore
    if(req.session.user){
        
     // @ts-ignore
     cartCount=await userHelpers.getCartCount(req.session.user._id)
    }
  productHelpers.getAllProducts().then((products)=>{
    
    
    res.render('user/view-products',{products,user,cartCount});

  })
});

router.get('/login',(req,res)=>{
    // @ts-ignore
    if(req.session.userLoggedIn){
        res.redirect('/')
    }else{
    // @ts-ignore
    res.render('user/login',{"loginErr":req.session.userloginErr})
    // @ts-ignore
    req.session.userloginErr=false
}
})

// @ts-ignore
router.get('/signup',(req,res)=>{
    res.render('user/signup')
})
router.post('/signup',(req,res)=>{
    userHelpers.doSignup(req.body).then((response)=>{
        
        // @ts-ignore
        req.session.user=response
        // @ts-ignore
        req.session.user.loggedIn=true

        res.redirect("/")
    })
    
})

router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
        if(response.status){
            // @ts-ignore
            req.session.user=response.user
            // @ts-ignore
            req.session.userLoggedIn=true
            res.redirect('/')
        }else{
            // @ts-ignore
            req.session.userloginErr=true
            res.redirect('/login')
        }
    })
})

router.get('/logout',(req,res)=>{
    // @ts-ignore
    req.session.user=null
    // @ts-ignore
    req.session.userLoggedIn=false
    res.redirect('/')
})

router.get('/cart',verifyLogin,async(req,res)=>{
    // @ts-ignore
    let products=await userHelpers.getCartProducts(req.session.user._id)  
    console.log(products)
    let totalValue=0;

   if(products.length>0){
    // @ts-ignore
    totalValue=await userHelpers.getTotalAmount(req.session.user._id)
   }
   
    // @ts-ignore
    res.render('user/cart',{products,user:req.session.user._id,totalValue})
})

router.get('/add-to-cart/:id',(req,res)=>{
    console.log('api call');
 // @ts-ignore
 userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
     res.json({status:true})  
    // res.redirect('/')
 })
})

// @ts-ignore
router.post('/change-product-quantity',(req,res,next)=>{
   console.log(req.body);
    userHelpers.changeProductQuantity(req.body).then(async(response)=>{
   
    if(req.body.quantity==1 && req.body.count==-1){
        response.total=0;
        
      }else{
        response.total=await userHelpers.getTotalAmount(req.body.user)
      }
        res.json(response)
    })
})

// @ts-ignore
router.post('/remove-product',(req,res,next)=>{
    console.log(req.body);
     userHelpers.removeItem(req.body).then((response)=>{
           res.json(response)
     })
 })

 router.get('/place-order',verifyLogin, async(req,res)=>{
    // @ts-ignore
    let total=await userHelpers.getTotalAmount(req.session.user._id)
    // @ts-ignore
    res.render('user/place-order',{total,user:req.session.user})
    
 })

 router.post('/place-order',async(req,res)=>{
    
     let products=await userHelpers.getCartProductList(req.body.userId)
     let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
     
     userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
         if(req.body['payment-method']==='COD'){
             res.json({codSuccess:true})
         }else{
             userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
                 console.log(response);
                 res.json(response)

             })
         }
      
     })
   

 })

 router.get('/order-success',(req,res)=>{
     // @ts-ignore
     res.render('user/order-success',{user:req.session.user})

 })

 router.get('/orders',async(req,res)=>{

    // @ts-ignore
    let orders=await userHelpers.getUserOrders(req.session.user._id)
      // @ts-ignore
      res.render('user/orders',{user:req.session.user,orders})
 })

 router.get('/view-order-products/:id',async(req,res)=>{
    let products=await userHelpers.getOrderProducts(req.params.id)
   console.log(products)
    // @ts-ignore
    res.render('user/view-order-products',{user:req.session.user,products})
  })

router.post('/verify-payment',(req,res)=>{
    console.log(req.body)
    userHelpers.verifyPayment(req.body).then(()=>{
        userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
            res.json({status:true})
        })
    // @ts-ignore
    }).catch((err)=>{
      
        res.json({status:false})
    })
})




module.exports = router;
