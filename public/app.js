// Grab the articles as a json
$.getJSON("/articles", function (data) {
    // For each one
    for (var i = 0; i < data.length; i++) {
        var comments = "";
        for (var comment of data[i].comments) {
            comments += "<p>" + comment.content + "<button data-type='delete-comment' data-id='" + comment._id + "'>Delete</button></p>";
        }

        $("#articles").append("<article data-id='" + data[i]._id + "'>" +
            "<p>" + data[i].headline + "</p>" +
            "<p>" + data[i].summary + "</p>" +
            "<p>URL: <a href='" + data[i].url + "' target='_blank'>" + data[i].url + "</a></p>" +
            "<p>comments:</p> " + comments +
            "<button data-type='add-comment' data-id='" + data[i]._id + "'>Add</button>" +
            "</article><br />");
    }
});


// Whenever someone clicks a p tag
$(document).on("click", "button", function () {
    var thisId = $(this).attr("data-id");
    var thisType = $(this).attr("data-type");

    if (thisType === 'delete-comment') {
        $.ajax({
            method: "DELETE",
            url: "/comments/" + thisId
        }).then(function () {
            document.location.reload();
        });
    } else if (thisType === 'add-comment') {
        var commentContent = window.prompt("What's your comment to this article?");
        $.ajax({
            method: "POST",
            url: "/articles/" + thisId,
            data: {
                content: commentContent
            }
        }).then(function () {
            document.location.reload();
        });
    } else if (thisType === 'scrape-articles') {
        $.ajax({
            method: "GET",
            url: "/scrape",
        }).then(function (data) {
            window.alert("added " + data.inserted + " new articles.");
            document.location.reload();
        });
    }
});