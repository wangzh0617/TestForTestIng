	//Card 卡片必须的数据
	/** 0图文，1链接，2微博，3链接分享，4图文分享，5视，6音，7测试 **/
	var type = request.params.type;//type=-1是无效的,int

	var source = request.params.source;//卡片来源,String
	var title = request.params.title;//卡片标题,String
	var titleFlag = request.params.titleFlag;//卡片标题标志,int
	var content = request.params.content;//卡片链接,String

	var contentImgsId = request.params.contentImgsId;//卡片内容图片文件Id数组,String[]
	var protectFlag = request.params.protectFlag;//是否受保护,int
	var imgCnt = request.params.imgCnt;//图片数量,int
	var coverId =request.params.coverId;//封面图片ID,String

	//UserImport表必须的数据
	var outUserId = request.params.outUserId;//外部导入的用户id,String
	var outUserName = request.params.outUserName;//外部导入的用户名,String
	var outUserImg = request.params.outUserImg;//外部导入的用户头像地址,String
	//UserCard 必须的数据
	var latitude = request.params.latitude;//地点对象-纬度,double
	var longitude = request.params.longitude;//地点对象-经度,double
	var moveSaveCardTime = request.params.moveSaveCardTime;//日期数据,String
	var folderId = request.params.folderId;//文件夹Id,String

	var folderHide = request.params.folderHide;//文件夹隐藏,int
	var userId = request.params.userId;//用户id,String

		//UserCardTag
	var tagArray = request.params.tagArray;//标签数组,String[]

	//当前创建逻辑
	//1、查询当前文件夹是否存在，是则继续
	//2、如果outUserId有值，直接保存并返会id继续，否则继续
	//3、如果type是图文，就上传content到subContent字段，否则直接设置content字段
	//4、保存card数据
	//5、为当前文件夹设置卡片使用量+1
	//6、保存userCard到数据库
	//7、用户动态表创建内容为0的字段
	//8、当前用户增加共享或隐藏卡卡片量
	//9、如果有标签，在卡片标签表里创建数据并增加当前标签共享或隐藏量，否则完成
	//数据失败时需要回滚的步骤

	//暂未用到
	var dataGoBackArray =[];
	dataGoBackArray[0]=0;//正常执行
	dataGoBackArray[1]=0;//正常执行
	dataGoBackArray[2]=0;//正常执行
	dataGoBackArray[3]=0;//正常执行
	dataGoBackArray[4]=0;//正常执行
	dataGoBackArray[5]=0;//正常执行
	dataGoBackArray[6]=0;//正常执行
	dataGoBackArray[7]=0;//正常执行
	dataGoBackArray[8]=0;//正常执行
	//外部导入UserImport的Id
	var backUserImportId = null;
	//图文创建，网页文件Id
	var backSubContentFileId = null;
	//卡片card的Id
	var backCardId=null;
	//文件夹量已经增加了，就设置此id
	var backFolderId = null;
	//UserCard表数据已经创建，就设置此id
	var backUserCardId = null;
	//用户动态表数据已经创建，就设置此id
	var backUserDynamicId = null;
	//用户共享量或隐藏量增加之后，就设置此用户id
	var backUserShareOrHideCount = null;
	//标签增长各种量之后，就设置此数组
	var backTagArray = null;
	//卡片标签的id数组，创建数据完成之后就设置此数组
	var backUserCardTagArray = null;

	//默认初始化的量，不需要传进来
	var likeCnt=0;//点赞量
	var viewCnt=0;//浏览量
	var reportCnt=0;//举报量
	var commentCnt=0;//这个是card和UserCard都会使用此默认值
	var collectCnt=1;//收藏量

	//global 对象
	var globalUserCardId=null;//全局UserCard
	var globalUserImportId = null;//全局外部导入
	var globalFolder = null;//全局folder
	var globalUserDynamic = null;//全局的用户动态

try{
		console.log("type="+type+","+"source="+source+","+"title="+title+","
		+"titleFlag="+titleFlag+","+"content="+content+","+"contentImgsId="+contentImgsId+","
		+"protectFlag="+protectFlag+","+"imgCnt="+imgCnt+","+"coverId="+coverId+","
		+"outUserId="+outUserId+","+"outUserImg="+outUserImg+","+"outUserName="+outUserName+","
		+"latitude="+latitude+","+"longitude="+longitude+","+"moveSaveCardTime="+moveSaveCardTime+","
		+"folderId="+folderId+","+"folderHide="+folderHide+","+"userId="+userId+","+"tagArray="+tagArray+","
		);

		if (!content||content===undefined||content===null) {
			throw new Error("content is null");
		}
		if (!folderId||folderId===undefined||folderId===null) {
			throw new Error("folderId is null");
		}
		if (!userId||userId===undefined||userId===null) {
			throw new Error("userId is null");
		}

		var card = new Card();
		card.fetchWhenSave(true);
		card.set('type',type);
		card.set('title',title);
		card.set('titleFlag',titleFlag);
		card.set('collectCnt',collectCnt);//收藏量默认是1
		card.set('reportCnt',reportCnt);
		card.set('commentCnt',commentCnt);
		card.set('viewCnt',viewCnt);
		card.set('likeCnt',likeCnt);
		card.set('imgCnt',imgCnt);
		card.set('userId',userId);
		if(!coverId||coverId===null||coverId===undefined){
		}else{
		    var coverFile = AV.File.createWithoutData(coverId);
		    card.set("cardCover",coverFile);
		}
		card.set('source',source);
		card.set('protectFlag',protectFlag);
		if(!contentImgsId||contentImgsId===null||contentImgsId===undefined){
		}else{
			card.set('contentImgsId',contentImgsId);
		}

		 	//查询当前传入的文件夹id是否存在
		var testCurrentFolderExits = new AV.Promise(function(resolve, reject){
			var testCurrentFolderQuery =new AV.Query("Folder");
			testCurrentFolderQuery.equalTo("objectId", folderId);
			testCurrentFolderQuery.equalTo("delFlag", 0);
			testCurrentFolderQuery.find({
					success: function(results) {
					    if (results.length===0) {
							dataGoBackArray[0]=1;//没找到当前文件夹
							reject();//设置出错
						}else if(results.length===1){
							resolve();//查到文件夹数据
						}
					  },
					error: function(error) {
					    reject();//没找到当前文件夹
					  }
					});
		});

	  testCurrentFolderExits.then(function(){//此文件夹存在
	    	console.log("找到此文件夹");
	        return;
		},function(){//未找到此文件夹
	        console.log("creat-未找到此文件夹");
			throw new Error("folder is not find");
		}).then(function(){
			if (!outUserId||outUserId===null||outUserId===undefined) {
	        	console.log("creat-UserImport是空的");
	    	    return outUserId;
			}else{

				var userImportPromise = new AV.Promise(function(resolve, reject){
					var userImportQuery=new AV.Query("Folder");
		            userImportQuery.equalTo("userId",outUserId);
					userImportQuery.equalTo("delFlag", 0);
					userImportQuery.find({
							success: function(results) {
							    if (results.length===0) {
									//没找到这个userid的新浪微博用户，添加进去
									var userImport = new UserImport();
						            userImport.fetchWhenSave(true);
						            userImport.set("userId",outUserId);
						            userImport.set("userName",outUserName);
						            userImport.set("userImg",outUserImg);
						            userImport.save(null, {
										  success: function(ui) {
										    // Execute any logic that should take place after the object is saved.
						            		console.log("creat-UserImport创建成功了");
										   	resolve(userImport.id);
										  },
										  error: function(ui, error) {
										    // Execute any logic that should take place if the save fails.
										    // error is a AV.Error with an error code and description.
										    console.log("creat-UserImport创建失败了");
										   reject();
										  }
										});
								}else if(results.length===1){
									resolve(userImport.id);//查到文件夹数据
								}
							  },
							error: function(error) {
							    reject();//没找到当前文件夹
							  }
						});
				});
	            return userImportPromise.then();
			}
		}).then(function(userImport){
			//userImport,这个userImport是上面查询返回下来的id
			if (!userImport||userImport===null||userImport===undefined) {
			   	return;
			}else {
				backUserImportId = userImport.id;//回滚是需要
				console.log("creat-userImportId="+userImport.id);
		   		return card.set("userImportId",userImport.id);//将卡片的userImportId字段更新成外部导入i
			}
		}).then(function(){//先将card保存
			//保存content字段内容，并根据type==图文，来确定是否设置subContent内容
			var filePromise = new AV.Promise(function(resolve, reject){
				/** 0图文，1链接，2微博，3链接分享，4图文分享，5视，6音，7测试 **/
				if (type === 0||type===2||type === 4) {//这个是网页源码
					card.set("subContent",content);
					var currentDate = new Date();
					//已经封装了HtmlHead和HtmlEnd在GLobal表里
					var newContent = global.HtmlHead+content.toString()+global.HtmlEnd;
					//保存成网页
					var file = new AV.File(userId+'_'+currentDate+'.html', new Buffer(newContent));
					file.save(function() {
					    // The file has been saved to AV.
					  	card.set("content",file.url());
						console.log("creat-详情链接地址："+file.url());
						backSubContentFileId = file.objectId();//回滚是需要
						console.log("creat-文件id："+file.objectId());
						resolve(file.objectId());
					}, function(error) {
					  // The file either could not be read, or could not be saved to AV.
					    reject();
						dataGoBackArray[2]=1;
					});
				}else if (type === 1||type === 3) {//这个是网页地址
					card.set("content",content);
					resolve();
				}

			});
			return filePromise.then();

	 	}).then(function(){
	 		console.log("creat-card.save()");
	 		return card.save();
	 	}).then(function(){
	 		backCardId = card.id;//回滚是需要
	 		console.log("creat-卡片已经创建==="+card.id);
			globalFolder = new Folder();//声明folder，作为对象传入UserCard
			console.log("creat-Folder==="+folderId);
	 		globalFolder.set("objectId",folderId);//设置id
	 		globalFolder.increment("cardCnt");
	 	    return	globalFolder.save();
	 	}).then(function(){//收到返回的card
	 		backFolderId = folderId;//回滚是需要
	 		var userCardPromise = new AV.Promise(function(resolve, reject){
	 			var userCard = new UserCard();//
		 		userCard.fetchWhenSave(true);
		 		if(!latitude||latitude===undefined||!longitude||longitude===undefined){//如果经纬度不为null，则声明对象，添加到UserCard
		 		}else{
		 		    var point = new AV.GeoPoint({latitude:latitude, longitude: longitude});
		 			userCard.set("geoLocation",point);
		 		}
		 		userCard.set("folderId",folderId);//UserCard放入folder
		 		console.log("creat-cardId==="+card.id);
		 		userCard.set("cardId",card.id);//放入cardid
		 		userCard.set("userId",userId);//放入用户id
		 		userCard.set("hideFlag",folderHide);//放入用户id
		 		// var myDate=new Date();
		 		// myDate.setTime(moveSaveCardTime);//传进来的时间是毫秒，先转化成Date在放入
		 		userCard.set("moveSaveCardTime",new Date());
		 		if (folderHide===1) {
		 			userCard.set("hideFlag",1);
		 		}
		 		userCard.save(null,{//保存userCard
			 			success:function(){
			 			console.log("creat-userCard.id==="+userCard.id);
			 			backUserCardId = userCard.id;//回滚时需要
						resolve(userCard.id);//设置为解决状态
					},
		 			error:function(userCard,error){//设置为出错状态
		 				reject(error);
		 				dataGoBackArray[4]=1;
		 			}
		 		});
	 		});
	 		return userCardPromise.then(function onFulfilled(result){
	 			globalUserCardId=result;
	 		});
	 	}).then(function(){
			console.log("creat-全局的UserCardID==="+globalUserCardId);
	 		globalUserDynamic = new UserDynamic();//声明用户动态对象
	 		globalUserDynamic.set("action",0);//默认放入0，代表创建
	 		globalUserDynamic.set("targetId",globalUserCardId);//默认0，就放入UserCard的id
	 		globalUserDynamic.set("userId",userId);//放入用户id
	 		return globalUserDynamic.save();
	 	}).then(function(){
	 		backUserDynamicId = globalUserDynamic.id;//回滚时需要
	 		var incrementUser = new User();
	 		incrementUser.set("objectId",userId);
	 	    if (folderHide===1) {
				incrementUser.increment("shareCardCnt");
	 		}else{
				incrementUser.increment("hideCardCnt");
	 		}
	 		return incrementUser.save();
	 	}).then(function(){
	 		backUserShareOrHideCount = userId;
			// ==	等于	x==8 为 false
			// ===	全等（值和类型）	x===5 为 true；x==="5" 为 false
	 		var tagArrayToUpdate =null;//存放需要更新数量的标签对象
	 		var userCardTagArray = null;//存放需要创建UserCardTag表数据的数组对象内容
	 		if (tagArray===null||tagArray===undefined) {//如果标签数据为0，就是没有标签，就不做处理
				console.log("creat-没有标签已返回");
	 			return;
	 		}else{//有标签
	 			backTagArray = [];//保存已更新的标签，回滚时需要
	 			backUserCardTagArray = [];//保存已经创建的卡片标签，回滚时需要

	 			console.log("creat-tagArray的大小"+tagArray.length);
				var promise = AV.Promise.as();
				for (var i = 0; i < tagArray.length; i++) {
					var tagArraySingle = tagArray[i];
					promise = promise.then(function(){
					    //每一次都用数组来保存userCardTag和tag，然后统一提交保存
						var saveUserTagAndTagTemp = [];
						var userCardTag = new UserCardTag();
			 			userCardTag.set("tagId",tagArraySingle);
			 			userCardTag.set("userCardId",globalUserCardId);
			 			saveUserTagAndTagTemp.push(userCardTag);


						//先放入准备查询的卡片标签到数组，如果创建失败了就执行了，成功就成功了
			 			var readQueryUserCardTag = new AV.Query("UserCardTag");
			 			readQueryUserCardTag.equalTo("tagId", tagArraySingle);
			 			readQueryUserCardTag.equalTo("userCardId", globalUserCardId);
			 			backUserCardTagArray.push(readQueryUserCardTag);

						//创建标签Tag对象
			 			var tag = new Tag();
			 			tag.set("objectId",tagArraySingle);//设置Id
			 			if (folderHide===0) {//共享，增加共享量
			 			}else if(folderHide ===1){//隐藏，不增加共享量
			 				tag.increment('sharedCnt');
			 			}else{//默认，增加共享量，但是一般不会进入这个
							tag.increment("sharedCnt");
			 			}
						tag.increment("tagCnt");
						saveUserTagAndTagTemp.push(tag);

						//这个是为了创建失败时执行回退操作用到，成功了用不到
						var backToTag = new Tag();
			 			backToTag.set("objectId",tagArraySingle);//设置Id
			 			if (folderHide===0) {//共享，-1
			 			}else if(folderHide ===1){//隐藏，-1
			 				backToTag.increment('sharedCnt',-1);
			 			}else{//默认，增加共享量，但是一般不会进入这个
							backToTag.increment('sharedCnt',-1);
			 			}
						backToTag.increment("tagCnt",-1);
						backTagArray.push(backToTag);

						return AV.Object.saveAll(saveUserTagAndTagTemp,null);
					});
				}
				return;
	 		}
	 	}).then(function(){
	 		console.log("creat-创建成功");
			response.success(globalUserCardId);
	 	},function(error){
		 	console.log("creat-开始检查恢复数据**************")


	        //回滚之恢复所有已更改的
			var backSaveAll = [];
			//回滚之删除所有已创建的
			var backDeleteSaveAll=[];

	 		if (backFolderId===null||!backFolderId||backFolderId===undefined) {

		 //	console.log("creat-backFolderId is null")
	 		}else{
				var globalFolder = new Folder();//声明folder，作为对象传入UserCard
		 		globalFolder.set("objectId",folderId);//设置id
		 		globalFolder.increment("cardCnt",-1);
		 	    backSaveAll.push(globalFolder);
		 	//console.log("creat-backFolderId is not null")
	 		}

	 		if (backCardId===null||!backCardId||backCardId===undefined) {
		 	//console.log("creat-backCardId is null")
	 		}else{

	 			var backCard = new Card();
	 			backCard.set("objectId",backCardId);
	 			backDeleteSaveAll.push(backCard);
	 			// backCard.destroy();
	 			//	console.log("creat-backCardId is not null")
	 		}

	 		if (backUserDynamicId===null||!backUserDynamicId||backUserDynamicId===undefined) {
	 		    //	console.log("creat-backUserDynamicId is null")
	 		}else{
	 			var backUserDynamic = new UserDynamic();
	 			backUserDynamic.set("objectId",backUserDynamicId);
	 			backDeleteSaveAll.push(backUserDynamic);
	 			// backUserDynamic.destroy();
	 		    //	console.log("creat-backUserDynamicId is not null")
	 		}
	 		if (backUserCardId===null||!backUserCardId||backUserCardId===undefined) {
	 		    //	console.log("creat-backUserCardId is null")
	 		}else{
	 			var backUserCard = new UserCard();
	 			backUserCard.set("objectId",backUserCardId);
	 			backDeleteSaveAll.push(backUserCard);
	 		    //	console.log("creat-backUserCardId is not null")
	 			// backUserCard.destroy();
	 		}
	 		if (backUserImportId===null||!backUserImportId||backUserImportId===undefined) {
	 		}else{
	 			var backUserImport = new UserImport();
	 			backUserImport.set("objectId",backUserImportId);
	 			backDeleteSaveAll.push(backUserImport);
	 			// backUserImport.destroy();
	 		}

	 		if (backSubContentFileId===null||!backSubContentFileId||backSubContentFileId===undefined) {
	 		}else{
	 			var backSubContentFile = new AV.File();
	 			backSubContentFile.set("objectId",backSubContentFileId);
	 			backDeleteSaveAll.push(backSubContentFile);
	 			// backSubContentFile.destroy();
	 		}

	 	    if (backUserShareOrHideCount===null||!backUserShareOrHideCount||backUserShareOrHideCount===undefined) {
	 		}else{
	 			var backUser = new User();//声明folder，作为对象传入UserCard
		 		backUser.set("objectId",folderId);//设置id
	 		    if (folderHide===1) {
					backUser.increment("shareCardCnt",-1);
		 		}else{
					backUser.increment("hideCardCnt",-1);
		 		}
		 	    backSaveAll.push(backUser);
	 		}


	 		var testDeleteArray = [];
	 		var x;
	 		for (x in backDeleteSaveAll) {
	 			var temp =new AV.Promise(function (resolve,reject) {
					backDeleteSaveAll[x].destroy({
					   success: function(){
					      //delete all objects by this query successfully.
					      resolve();
					   },
					   error: function(err){
					      //There was an error.
					      reject();
					   }
					});
				});
		 		//console.log("creat-testDeleteArray push temp");
	 			testDeleteArray.push(temp);
	 		}


	 		AV.Promise.all(testDeleteArray).then(function(){
		 		console.log("creat-backSaveAll when");
	 			return AV.Promise.when(backSaveAll);
	 		}).then(function(){
	 			console.log("creat-如果创建失败，并且标签的各种量已经加了，就给他们减去");
	 			//如果用户有上传过来的标签，并且它如果创建失败，并且标签的各种量已经加了，就给他们减去
		 		if (backTagArray===null||!backTagArray||backTagArray===undefined) {
		 			return;
		 		}else{
		 			console.log("creat-backTagArray length"+backTagArray.length);
		 			return AV.Object.saveAll(backTagArray,null);
		 		}
	 		}).then(function(){
	 			console.log("creat-查询卡片标签userCardTag，并删除");
	 			//查询卡片标签userCardTag，并删除
		 		if (backUserCardTagArray===null||!backUserCardTagArray||backUserCardTagArray===undefined) {
		 			return;
		 		}else{
					var queryPromise = [];
		 			for (var i = 0; i < backUserCardTagArray.length; i++) {
		 				var queryObject = backUserCardTagArray[i];
				 		var findPromise=new AV.Promise(function (resolve,reject) {
										queryObject.find({
										  success: function(results) {
										    if (results.length>0) {
												results[0].destroy({
													success: function(){
											  	    resolve();//已解决
												   },
													error: function(err){
												    reject();//删除出错

												   }
												});
										    }else{
												resolve();//已解决
										    }
										  },
										  error: function(error) {
										     reject();//删除出错
										  }
										});
									});

		 				queryPromise.push(findPromise);
		 			};
		 			return AV.Promise.when(queryPromise);
		 		}
	 		}).then(function(){
			    console.log("creat-所有已经创建的都已删除");
			},function(error){
				console.log(error);
			}).then(function(){
			    console.log("creat-结束检查恢复数据**************");
				console.log("creat-创建失败:"+error);
				response.error("创建失败:"+error);
			});
	 	});

}catch(error){
	response.error(error);
}
