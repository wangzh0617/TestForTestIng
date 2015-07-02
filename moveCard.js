var targetFolderId = request.params.targetFolderId;//目标文件夹id
// var targetFolderHideFlag  = request.params.targetFolderHideFlag;//目标文件夹的隐藏属性
var userCardId = request.params.userCardId;//当前UserCard卡片id
var userId = request.params.userId;//当前操作用户

var currentFolderId;//当前文件夹id

var globalCurrentFolder = null;//当前文件夹对象
var globalTargetFolder = null;//目标文件夹对象

var isContiue = 0;//是否继续执行，0继续1完成
try{

	if (!userCardId||userCardId===undefined||userCardId===null) {
		throw new Error("无效的参数,userCardId未获取到");
	}
	if (!targetFolderId||targetFolderId===undefined||targetFolderId===null) {
		throw new Error("无效的参数,targetFolderId未获取到");
	}

	//查询当前卡片是否已经移动到目标文件夹
	var userCardInFolder =new AV.Promise(function(resolve, reject){
		var userCardQuery =new AV.Query("UserCard");
	  userCardQuery.equalTo("delFlag", 0);
		userCardQuery.get(userCardId,{
			success:function(userCard){
				currentFolderId = userCard.get("folderId");//将此文件夹id赋值给全局文件夹id
				if (currentFolderId!==targetFolderId) {//判断全局文件夹id是否和目标文件夹id相同,正常，不相同是代表未移动到这个文件夹过，可以移动
					if (userId===userCard.get("userId")) {
						resolve(userCard);
					}else{
						reject("不能移动，因为当前操作用户与卡片用户不相同。");
					}

				}else{
					reject("不能移动到此文件夹,因为文件夹相同");//已经移动了
				}
			},
			error:function(userCard,error){
			    reject("未找到该卡片");
			}
		});
	});

  userCardInFolder.then(function(userCard){
		console.log("userCard===id="+userCard.id);
		return;
	},function(error){
	    console.log(error);
	   	return error;
	}).then(function(){
		//查询目标卡片
		var queryTargetFolder =new AV.Promise(function(resolve, reject){
			var tarFolderQuery =new AV.Query("Folder");
		  tarFolderQuery.equalTo("delFlag", 0);
			tarFolderQuery.get(targetFolderId,{
			  success: function(object) {
			    // object is an instance of AV.Object.
			    globalTargetFolder = object;//将查询到的结果给全局的
			    console.log("globalTargetFolder===id="+globalTargetFolder.id);
			    resolve(globalTargetFolder);//正确的返回出去
			  },

			  error: function(object, error) {
			    // error is an instance of AV.Error.
			    console.log("查询目标文件夹出错："+error.message);
			    reject();
			  }
			});
		});
		return queryTargetFolder.then();
	}).then(function(){
		var queryCurrentFolder =new AV.Promise(function(resolve, reject){

			var currentFolderQuery =new AV.Query("Folder");
		  currentFolderQuery.equalTo("delFlag", 0);
			currentFolderQuery.get(currentFolderId,{
			  success: function(object) {
			    // object is an instance of AV.Object.
			    globalCurrentFolder = object;
	 			console.log("globalCurrentFolder===id="+globalCurrentFolder.id);
	 			resolve(globalCurrentFolder);
			  },

			  error: function(object, error) {
			    // error is an instance of AV.Error.
			    console.log("查询目标文件夹出错："+error.message);
			    reject();
			  }
			});
		});
		return queryCurrentFolder.then();
	}).then(function(){
		var saveAllData =new AV.Promise(function(resolve, reject){
			var saveAllFolder = [];
      //如果当前文件夹id和传进来的文件夹id不相同才会走到这一步
      //将当前usercard的文件夹修改成目标文件夹
			console.log("当前folderid==="+currentFolderId);
			var userCard = new UserCard();
			userCard.set("objectId",userCardId);
			userCard.set("folderId",targetFolderId);
			if (globalTargetFolder.get("hideFlag")===0) {//隐藏
				userCard.set("hideFlag",0);
      }else{//不隐藏
				userCard.set("hideFlag",1);
      }
			saveAllFolder.push(userCard);

			//当前文件夹的卡片量-1
			var currentFolder = new Folder();
			currentFolder.set("objectId",currentFolderId);
			currentFolder.increment("cardCnt",-1);
			saveAllFolder.push(currentFolder);

			//目标文件夹的卡片量+1
			var targetFolder = new Folder();
			targetFolder.set("objectId",targetFolderId);
			targetFolder.increment("cardCnt",1);
			saveAllFolder.push(targetFolder);

			//保存所有
			AV.Object.saveAll(saveAllFolder, function(list, error) {
				    if (list) {
				      resolve();
				    } else {
				      reject();
				    }
				});
		});
		return saveAllData.then();
	}).then(function(){
		if (globalTargetFolder.get("hideFlag")===globalCurrentFolder.get("hideFlag")) {
			console.log("相等");
			isContiue = 1;//如果相等的话，更改标签数量就不用执行
		}else{
			console.log("不相等");
			isContiue = 0;//否则
		}
		return isContiue;
	}).then(function(){
		if (isContiue===0) {//继续更改标签数量
			var tagUserCard= new AV.Query("UserCardTag");
			tagUserCard.equalTo("userCardId",userCardId);
	        tagUserCard.equalTo("delFlag", 0);
			tagUserCard.limit(10);
			return tagUserCard.find();
		}else if (isContiue===1) {//完成
			return;
		}
	}).then(function(tagUserCards){
		if (isContiue===0) {//继续更改标签数量
			var saveAllTagData =new AV.Promise(function(resolve, reject){
				var tagPromiseArray = [];
	            for (var i = 0; i < tagUserCards.length; i++) {
	                var tuc = tagUserCards[i];//找到的当前卡片的标签
	                var tagUpdate = new Tag();
	                tagUpdate.set("objectId",tuc.get("tagId"));
	                 if (globalTargetFolder.get("hideFlag")===0) {//隐藏
	                    tagUpdate.increment("sharedCnt",-1);
	                }else{//不隐藏
	                    tagUpdate.increment("sharedCnt",1);
	                }
	                tagPromiseArray.push(tagUpdate);
	            }

	            //保存所有
				AV.Object.saveAll(tagPromiseArray, function(list, error) {
				    if (list) {
				      // All the objects were saved.
				      resolve();
				    } else {
				      // An error occurred.
				      reject();
				    }
				});
			});
			return saveAllTagData.then();
		}else if (isContiue===1) {//完成
			return;
		}
	}).then(function(){
		if (isContiue===0) {//继续修改用户卡片数量
			var changeUserCardCount = new AV.Promise(function(resolve, reject){
				var changeUser = new User();
				changeUser.set('objectId',userId);
				if (globalTargetFolder.get("hideFlag")===0) {
					//如果目标文件夹的隐藏标志是0（隐藏），那么就把用户的隐藏卡片数量+1，同时共享卡片数量-1
					changeUser.increment('shareCardCnt',-1);
					changeUser.increment('hideCardCnt',1);
				}else{
					//如果是共享标志的文件夹，就增加用户共享卡片数量，隐藏卡片数量-1
					changeUser.increment('shareCardCnt',1);
					changeUser.increment('hideCardCnt',-1);
				}
				changeUser.save(null, {
						  success: function(ui) {
						    // Execute any logic that should take place after the object is saved.
						    console.log("moveCard-修改用户卡片数量成功");
						   resolve();
						  },
						  error: function(ui, error) {
						    // Execute any logic that should take place if the save fails.
						    // error is a AV.Error with an error code and description.
						    console.log("moveCard-修改用户卡片数量失败");
						   reject();
						  }
						});
			});
			return changeUserCardCount.then();
		}else{
			return;
		}
	}).then(function(){
		response.success(global.SUCCESS);
	},function(error){
		response.error("移动失败:"+error.message);
	});

}catch(error){
	response.error(error);
}
