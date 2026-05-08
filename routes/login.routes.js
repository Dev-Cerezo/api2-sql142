const express = require('express');
const router = express.Router();

const logincontroller = require('../controllers/apilogin/login');
const authController = require('../controllers/apilogin/login');
const authMiddleware = require('../controllers/middlaware/middlaware'); // Importar

// Ruta de Login JWT
router.post('/loginT', authController.loginUsuario);

// Login JWT para aguacateTemperatura (POST; credenciales en cuerpo, no en URL)
router.post('/loginAguacate', authController.loginAguacateTemperatura);

// Rutas protegidas (Requieren token)
// Ejemplo: Obtener perfil o datos sensibles
router.get('/perfilT', authMiddleware, (req, res) => {
  console.log(req)
    // Gracias al middleware, aquí ya tenemos req.usuarioLogueado
    res.json({
        mensaje: "Bienvenido al área privada",
        tu_id: req.user
    });
});


router.route('/usuarios').get((request,response)=>{
    logincontroller.getUsuario ().then(result => {
      response.json(result);
    });
  });


  router.route('/createusuarios').post((request,response)=>{
    let params = {...request.body}
    logincontroller.createUsuario(params).then(result => {
    response.status(201).json(result);
    });
  });


  router.route('/roles').get((request,response)=>{
    logincontroller.getRoles ().then(result => {
      response.json(result);
    });
  });

  router.route('/createroles').post((request,response)=>{
    let params = {...request.body}
    logincontroller.createRoles(params).then(result => {
    response.status(201).json(result);
    });
  });

  router.route('/usuariosroles').get((request,response)=>{
    logincontroller.getUsuariosRoles ().then(result => {
      response.json(result);
    });
  });


  router.route('/createusuariosroles').post((request,response)=>{
    let params = {...request.body}
    logincontroller.createUsuariosRoles(params).then(result => {
    response.status(201).json(result);
    });
  });

  router.route('/usuarioExiste').get((request,response)=>{
    let params = {...request.body}
    logincontroller.getUsuariosExistente(params).then(result => {
      response.json(result);
    });
  });

    router.route('/usuarioExisteViaticos').get((request,response)=>{
    let params = {...request.body}
    logincontroller.getUsuariosExistenteViaticos(params).then(result => {
      response.json(result);
    });
  });



  router.route('/usuarioExisteTempus/:email/:pass').get((request,response)=>{
    const params = request.params;
    logincontroller.getUsuariosExistenteTempus(params).then(result => {
      response.json(result);
    });
  });

  router.route('/usuariosroles/:id_usuarios_roles').delete((request, response) => {
    const { id_usuarios_roles } = request.params;
    logincontroller.deleteUsuariosRole(id_usuarios_roles).then(result => {
        response.status(201).json(result);
    });
});


  router.route('/getusuarioExiste/:email/:pass').get((request,response)=>{
    const params = request.params;
    logincontroller.getUsuariosExistente(params).then(result => {
      response.json(result);
    });
  });

  router.route('/getusuarioExisteViaticos/:email').get((request,response)=>{
    const params = request.params;
    logincontroller.getUsuariosExistenteViaticos(params).then(result => {
      response.json(result);
    });
  });

  

  //valida,
router.route('/valida').get((request,response)=>{
  logincontroller.valida().then(result => {
    response.json(result);
  });
});

  

module.exports = router;