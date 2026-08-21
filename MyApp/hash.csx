using BCrypt.Net;
var hash = BCrypt.HashPassword("Test@1234");
Console.WriteLine(hash);