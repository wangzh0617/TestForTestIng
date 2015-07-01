try{ 
    // throw new Error("暂时停用此接口，正在修复中");//folderId
    var folderId = request.params.folderId;
    //userId
    var userId = request.params.userId;
    //要改成的隐藏targetHideFlag标志
    var targetHideFlag = request.params.targetHideFlag;
    var limit = 1000;


    if (!folderId||folderId===undefined||folderId===null) {
        throw new Error("changeFolderHideFlag-folderId is null");
    }
    if (!userId||userId===undefined||userId===null) {
        throw new Error("changeFolderHideFlag-userId is null");
    }

    var folderQuery = new AV.Query("UserCard");
    folderQuery.equalTo("userId", userId);
    folderQuery.equalTo("delFlag", 0);
    folderQuery.equalTo("folderId", folderId);
    folderQuery.count().then(function(count){
        var page = Math.ceil(count / limit);
        console.log("当前页数----->"+page);
        var folderUserCard = [];
        var childUserCardPromise = AV.Promise.as();
        for (var i = 0; i < page; i++) {//第几页
            childUserCardPromise = childUserCardPromise.then(function(){
                var childFolderQuery = new AV.Query("UserCard");
                childFolderQuery.equalTo("userId", userId);
                childFolderQuery.equalTo("folderId", folderId);
                childFolderQuery.equalTo("delFlag", 0);
                childFolderQuery.limit(limit);
                childFolderQuery.skip(i * limit);
                childFolderQuery.find().then(function(childFolderDatas){
                    var userCardQueryPromise = [];
                    var userCardQueryPromiseFor  = AV.Promise.as();
                    for (var i = 0; i < childFolderDatas.length; i++) {
                        var child =childFolderDatas[i];
                        userCardQueryPromiseFor = userCardQueryPromiseFor.then(function(){
                            var folderChangeChild = new AV.Promise(function(resolve, reject){
                                var usercard = new UserCard();
                                usercard.set("objectId",child.id);
                                console.log("child---id-->"+child.id);//
                                usercard.set("hideFlag",targetHideFlag);
                                usercard.save(null, {
                                      success: function(ui) {
                                       console.log("usercard隐藏属性保存成功了");
                                       resolve();
                                      },
                                      error: function(ui, error) {
                                       console.log("usercard隐藏属性保存失败了");
                                       reject();
                                      }
                                    });
                            });
                            folderChangeChild.then(function(){
                                var tagUserCard= new AV.Query("UserCardTag");
                                tagUserCard.equalTo("userCardId",child.id);
                                tagUserCard.equalTo("delFlag", 0);
                                tagUserCard.limit(10);//目前同一个UserCard里标签最多是5个
                                return tagUserCard.find();
                            }).then(function(tagUserCards){
                                console.log("tagUserCards----->"+tagUserCards.length);
                                var tagPromiseArray = [];
                                for (var i = 0; i < tagUserCards.length; i++) {
                                    var tuc = tagUserCards[i]
                                    var tagUpdate = new Tag();
                                    tagUpdate.set("objectId",tuc.get("tagId"));
                                    if (targetHideFlag===0) {//隐藏
                                        tagUpdate.increment("sharedCnt",-1);
                                    }else{//不隐藏
                                        tagUpdate.increment("sharedCnt",1);
                                    }
                                    tagPromiseArray.push(tagUpdate);
                                }

                                console.log("tagPromiseArray---tag-->"+tagPromiseArray.length);//
                                return AV.Object.saveAll(tagPromiseArray,null);
                            });
                        };
                        userCardQueryPromise.push(userCardQueryPromiseFor);
                    }//
                    return AV.Promise.when(userCardQueryPromise);
                });//
            });//new 的promise结束
            folderUserCard.push(childUserCardPromise);
        }
        return AV.Promise.when(folderUserCard);
    }).then(function(success){
        var saveFolderHidePromise = new AV.Promise(function(resolve, reject){
            var saveFolderHide = new Folder();
            saveFolderHide.set("objectId",folderId);
            saveFolderHide.set("hideFlag",targetHideFlag);
            saveFolderHide.save(null, {
                      success: function(ui) {
                        // Execute any logic that should take place after the object is saved.
                        console.log("changeUserFolderCount成功了");
                       resolve();
                      },
                      error: function(ui, error) {
                        // Execute any logic that should take place if the save fails.
                        // error is a AV.Error with an error code and description.
                        console.log("changeUserFolderCount失败了");
                       reject();
                      }
                    });
        });
        return saveFolderHidePromise.then();
    },function(error){
        return error;
    }).then(function(){
        var changeUserFolderCount = new AV.Promise(function(resolve, reject){
            var changeUserFolder = new User();
            changeUserFolder.set('objectId',userId);
            if (targetHideFlag===0) {
                //如果目标文件夹的隐藏标志是0（隐藏），那么就把用户的隐藏卡片数量+1，同时共享卡片数量-1     
                changeUserFolder.increment('shareFolderCnt',-1);
                changeUserFolder.increment('hideFolderCnt',1);
            }else{
                //如果是共享标志的文件夹，就增加用户共享卡片数量，隐藏卡片数量-1
                changeUserFolder.increment('shareFolderCnt',1);
                changeUserFolder.increment('hideFolderCnt',-1);
            }
            changeUserFolder.save(null, {
                      success: function(ui) {
                        // Execute any logic that should take place after the object is saved.
                        console.log("changeUserFolderCount成功了");
                       resolve();
                      },
                      error: function(ui, error) {
                        // Execute any logic that should take place if the save fails.
                        // error is a AV.Error with an error code and description.
                        console.log("changeUserFolderCount失败了");
                       reject();
                      }
                    });
        });
        return changeUserFolderCount.then();
    }).then(function(success){
       response.success(global.SUCCESS);
    },function(error){
        response.error("修改失败");
    });
}catch(error){
    response.error(error);
}